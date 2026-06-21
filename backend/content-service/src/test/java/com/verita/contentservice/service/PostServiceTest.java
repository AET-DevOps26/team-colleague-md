package com.verita.contentservice.service;

import com.verita.contentservice.entity.PostEntity;
import com.verita.contentservice.entity.PostStatus;
import com.verita.contentservice.entity.TopicEntity;
import com.verita.contentservice.dto.UserPreferencesDto;
import com.verita.contentservice.dto.UserProfileDto;
import com.verita.contentservice.repository.BookmarkRepository;
import com.verita.contentservice.repository.PostRepository;
import com.verita.contentservice.repository.TopicRepository;
import com.verita.contentservice.repository.VoteRepository;
import com.verita.contentservice.client.UserClient;
import com.verita.contentservice.security.SecurityUtils;
import com.verita.model.AuthorSummary;
import com.verita.model.PostCard;
import com.verita.model.PostPage;
import com.verita.model.PostPatchRequest;
import com.verita.model.PostRequest;
import com.verita.model.PostResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class PostServiceTest {

    @Mock private PostRepository postRepository;
    @Mock private TopicRepository topicRepository;
    @Mock private VoteRepository voteRepository;
    @Mock private BookmarkRepository bookmarkRepository;
    @Mock private UserClient userClient;
    @Mock private SecurityUtils securityUtils;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private PostService postService;

    private static final String AUTH = "Bearer token";
    private UUID userId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        userId = UUID.randomUUID();
        // Identity now comes from the verified token via SecurityUtils (ADR-0006).
        lenient().when(securityUtils.getCurrentUserId()).thenReturn(userId);
        lenient().when(securityUtils.getCurrentUserIdOptional()).thenReturn(Optional.of(userId));
        // save() echoes the entity back, assigning an id like the DB would
        when(postRepository.save(any(PostEntity.class))).thenAnswer(inv -> {
            PostEntity p = inv.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            return p;
        });
    }

    private UserProfileDto profile(UUID id, String username) {
        return new UserProfileDto(id, username, "Alice", null, "USER", null);
    }

    private PostEntity post(UUID author, PostStatus status) {
        PostEntity p = new PostEntity();
        p.setId(UUID.randomUUID());
        p.setAuthorId(author);
        p.setStatus(status);
        p.setTitle("A valid title");
        p.setContent("Some content here");
        return p;
    }

    // ---- create -------------------------------------------------------------

    @Test
    void createPost_publishesSummaryEvent_andReturnsResponse() {
        PostRequest request = new PostRequest("A valid title", "Hello world content")
                .status(PostRequest.StatusEnum.PUBLISHED)
                .topics(List.of());

        PostResponse response = postService.createPost(request);

        assertNotNull(response);
        assertNotNull(response.getId());
        assertEquals("A valid title", response.getTitle());
        verify(eventPublisher).publishEvent(any(PostSummaryRequestedEvent.class));
        verify(postRepository).save(any(PostEntity.class));
    }

    @Test
    void createPost_withoutExcerpt_truncatesContentTo240Chars() {
        String longContent = "x".repeat(500);
        PostRequest request = new PostRequest("A valid title", longContent)
                .status(PostRequest.StatusEnum.PUBLISHED)
                .topics(List.of());

        PostResponse response = postService.createPost(request);

        assertEquals(240, response.getExcerpt().length());
    }

    // ---- update / patch ownership ------------------------------------------

    @Test
    void updatePost_nonAuthor_throwsForbidden() {
        PostEntity owned = post(UUID.randomUUID(), PostStatus.PUBLISHED); // different author
        when(postRepository.findByIdAndDeletedFalse(owned.getId())).thenReturn(Optional.of(owned));

        PostRequest request = new PostRequest("A valid title", "content").topics(List.of());
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.updatePost(owned.getId(), request));

        assertEquals(403, ex.getStatusCode().value());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void updatePost_missingPost_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(postRepository.findByIdAndDeletedFalse(id)).thenReturn(Optional.empty());

        PostRequest request = new PostRequest("A valid title", "content").topics(List.of());
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.updatePost(id, request));

        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void patchPost_titleChange_publishesSummaryEvent() {
        PostEntity owned = post(userId, PostStatus.PUBLISHED);
        when(postRepository.findByIdAndDeletedFalse(owned.getId())).thenReturn(Optional.of(owned));

        PostPatchRequest patch = new PostPatchRequest().title("A brand new title");
        postService.patchPost(owned.getId(), patch);

        assertEquals("A brand new title", owned.getTitle());
        verify(eventPublisher).publishEvent(any(PostSummaryRequestedEvent.class));
    }

    @Test
    void patchPost_metadataOnly_doesNotPublishSummaryEvent() {
        PostEntity owned = post(userId, PostStatus.PUBLISHED);
        when(postRepository.findByIdAndDeletedFalse(owned.getId())).thenReturn(Optional.of(owned));

        // status only: not a summary input, so no GenAI re-summarization
        PostPatchRequest patch = new PostPatchRequest().status(PostPatchRequest.StatusEnum.DRAFT);
        postService.patchPost(owned.getId(), patch);

        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void patchPost_explicitNullExcerpt_clearsExcerpt() {
        PostEntity owned = post(userId, PostStatus.PUBLISHED);
        owned.setExcerpt("old excerpt");
        when(postRepository.findByIdAndDeletedFalse(owned.getId())).thenReturn(Optional.of(owned));

        PostPatchRequest patch = new PostPatchRequest().excerpt(null); // JsonNullable.of(null) -> clear
        postService.patchPost(owned.getId(), patch);

        assertNull(owned.getExcerpt());
    }

    // ---- get / visibility ---------------------------------------------------

    @Test
    void getPost_published_incrementsViewCount() {
        PostEntity p = post(UUID.randomUUID(), PostStatus.PUBLISHED);
        when(postRepository.findByIdAndDeletedFalse(p.getId())).thenReturn(Optional.of(p));

        PostResponse response = postService.getPost(p.getId());

        assertNotNull(response);
        verify(postRepository).incrementViewCount(p.getId());
    }

    @Test
    void getPost_draftByNonAuthor_throwsNotFound() {
        PostEntity draft = post(UUID.randomUUID(), PostStatus.DRAFT); // someone else's draft
        when(postRepository.findByIdAndDeletedFalse(draft.getId())).thenReturn(Optional.of(draft));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.getPost(draft.getId()));

        assertEquals(404, ex.getStatusCode().value());
        verify(postRepository, never()).incrementViewCount(any());
    }

    @Test
    void getPost_draftByAuthor_isVisible() {
        PostEntity draft = post(userId, PostStatus.DRAFT); // my own draft
        when(postRepository.findByIdAndDeletedFalse(draft.getId())).thenReturn(Optional.of(draft));

        PostResponse response = postService.getPost(draft.getId());

        assertNotNull(response);
        verify(postRepository).incrementViewCount(draft.getId());
    }

    // ---- delete + topic counters -------------------------------------------

    @Test
    void deletePost_published_softDeletesAndDecrementsTopicCounts() {
        PostEntity owned = post(userId, PostStatus.PUBLISHED);
        TopicEntity topic = new TopicEntity();
        topic.setId(UUID.randomUUID());
        topic.setName("java");
        owned.getTopics().add(topic);
        when(postRepository.findByIdAndDeletedFalse(owned.getId())).thenReturn(Optional.of(owned));

        postService.deletePost(owned.getId());

        assertTrue(owned.isDeleted());
        assertNotNull(owned.getDeletedAt());
        verify(topicRepository).decrementTotalPostCount(topic.getId());
    }

    @Test
    void deletePost_draft_doesNotTouchTopicCounts() {
        PostEntity owned = post(userId, PostStatus.DRAFT);
        TopicEntity topic = new TopicEntity();
        topic.setId(UUID.randomUUID());
        owned.getTopics().add(topic);
        when(postRepository.findByIdAndDeletedFalse(owned.getId())).thenReturn(Optional.of(owned));

        postService.deletePost(owned.getId());

        assertTrue(owned.isDeleted());
        verify(topicRepository, never()).decrementTotalPostCount(any());
    }

    // ---- bookmark / like privacy gates -------------------------------------

    @Test
    void getUserBookmarks_otherUserWithBookmarksHidden_throwsForbidden() {
        UUID target = UUID.randomUUID();
        when(userClient.getUserPreferences(target)).thenReturn(new UserPreferencesDto(false, true));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.getUserBookmarks(target, 0, 10));

        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    void getUserBookmarks_prefsLookupThrows_failsClosedForbidden() {
        UUID target = UUID.randomUUID();
        when(userClient.getUserPreferences(target)).thenThrow(new RuntimeException("user service down"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.getUserBookmarks(target, 0, 10));

        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    void getUserBookmarks_otherUserWithBookmarksShown_returnsPage() {
        UUID target = UUID.randomUUID();
        when(userClient.getUserPreferences(target)).thenReturn(new UserPreferencesDto(true, false));
        when(postRepository.findBookmarkedPublishedPostsByUserId(eq(target), any()))
                .thenReturn(Page.empty());

        PostPage page = postService.getUserBookmarks(target, 0, 10);

        assertNotNull(page);
        assertEquals(0, page.getTotalElements());
    }

    @Test
    void getUserBookmarks_self_skipsPreferenceCheck() {
        when(postRepository.findBookmarkedPublishedPostsByUserId(eq(userId), any()))
                .thenReturn(Page.empty());

        postService.getUserBookmarks(userId, 0, 10);

        verify(userClient, never()).getUserPreferences(any());
    }

    @Test
    void getUserLikes_otherUserWithLikesHidden_throwsForbidden() {
        UUID target = UUID.randomUUID();
        when(userClient.getUserPreferences(target)).thenReturn(new UserPreferencesDto(true, false));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.getUserLikes(target, 0, 10));

        assertEquals(403, ex.getStatusCode().value());
    }

    // ---- cards --------------------------------------------------------------

    @Test
    void getCards_moreThan50Ids_throwsBadRequest() {
        List<UUID> ids = java.util.stream.Stream.generate(UUID::randomUUID).limit(51).toList();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> postService.getCards(ids));

        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void getCards_filtersDraftsAndPreservesRequestOrder() {
        PostEntity p1 = post(userId, PostStatus.PUBLISHED);
        PostEntity p2 = post(userId, PostStatus.PUBLISHED);
        PostEntity draft = post(userId, PostStatus.DRAFT);
        List<UUID> ids = List.of(p1.getId(), draft.getId(), p2.getId());
        // repository returns them in arbitrary order; service must reorder to match ids and drop the draft
        when(postRepository.findByIdInAndDeletedFalse(any())).thenReturn(List.of(p2, draft, p1));

        List<PostCard> cards = postService.getCards(ids);

        assertEquals(2, cards.size());
        assertEquals(p1.getId(), cards.get(0).getId());
        assertEquals(p2.getId(), cards.get(1).getId());
    }

    // ---- listing routes the right query ------------------------------------

    @Test
    void getAllPosts_noTopic_usesUnfilteredQuery() {
        when(postRepository.findByDeletedFalseAndStatusOrderByCreatedAtDesc(eq(PostStatus.PUBLISHED), any()))
                .thenReturn(Page.empty());

        postService.getAllPosts(0, 10, null);

        verify(postRepository).findByDeletedFalseAndStatusOrderByCreatedAtDesc(eq(PostStatus.PUBLISHED), any());
    }

    @Test
    void getAllPosts_withTopic_usesTopicFilteredQuery() {
        when(postRepository.findByDeletedFalseAndStatusAndTopics_NameIgnoreCaseOrderByCreatedAtDesc(
                eq(PostStatus.PUBLISHED), eq("java"), any())).thenReturn(Page.empty());

        postService.getAllPosts(0, 10, "java");

        verify(postRepository).findByDeletedFalseAndStatusAndTopics_NameIgnoreCaseOrderByCreatedAtDesc(
                eq(PostStatus.PUBLISHED), eq("java"), any());
    }

    // ---- pure helpers / author summary -------------------------------------

    @Test
    void clampPageSize_cappedAt100() {
        assertEquals(100, PostService.clampPageSize(500));
        assertEquals(10, PostService.clampPageSize(10));
    }

    @Test
    void authorSummary_userServiceFailure_degradesToUnknown() {
        UUID author = UUID.randomUUID();
        when(userClient.getUserById(author)).thenThrow(new RuntimeException("unavailable"));

        AuthorSummary summary = postService.authorSummary(author);

        assertEquals("unknown", summary.getUsername());
        assertEquals("Unknown", summary.getDisplayName());
        assertEquals(author, summary.getId());
    }

    @Test
    void authorSummary_populatesFieldsFromProfile() {
        UUID author = UUID.randomUUID();
        when(userClient.getUserById(author))
                .thenReturn(new UserProfileDto(author, "bob", "Bob Builder", null, "VERIFIED", "ACME"));

        AuthorSummary summary = postService.authorSummary(author);

        assertEquals("bob", summary.getUsername());
        assertEquals("Bob Builder", summary.getDisplayName());
        assertEquals("ACME", summary.getOrganisation().get());
    }

    @Test
    void getMyDrafts_queriesCurrentUsersDrafts() {
        when(postRepository.findByDeletedFalseAndAuthorIdAndStatusOrderByCreatedAtDesc(
                eq(userId), eq(PostStatus.DRAFT), any())).thenReturn(Page.empty());

        postService.getMyDrafts(0, 10);

        verify(postRepository).findByDeletedFalseAndAuthorIdAndStatusOrderByCreatedAtDesc(
                eq(userId), eq(PostStatus.DRAFT), any());
    }
}
