package com.verita.contentservice.service;

import com.verita.contentservice.entity.BookmarkEntity;
import com.verita.contentservice.entity.CommentEntity;
import com.verita.contentservice.entity.PostEntity;
import com.verita.contentservice.entity.PostStatus;
import com.verita.contentservice.entity.VoteEntity;
import com.verita.contentservice.entity.VoteTargetType;
import com.verita.contentservice.entity.VoteType;
import com.verita.contentservice.repository.BookmarkRepository;
import com.verita.contentservice.repository.CommentRepository;
import com.verita.contentservice.repository.PostRepository;
import com.verita.contentservice.repository.VoteRepository;
import com.verita.contentservice.security.SecurityUtils;
import com.verita.model.LikeRequest;
import com.verita.model.PostLikeResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class InteractionServiceTest {

    @Mock private PostRepository postRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private VoteRepository voteRepository;
    @Mock private BookmarkRepository bookmarkRepository;
    @Mock private SecurityUtils securityUtils;
    @InjectMocks private InteractionService interactionService;

    private UUID userId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        userId = UUID.randomUUID();
        when(securityUtils.getCurrentUserId()).thenReturn(userId);
    }

    private PostEntity publishedPost() {
        PostEntity p = new PostEntity();
        p.setId(UUID.randomUUID());
        p.setAuthorId(UUID.randomUUID());
        p.setStatus(PostStatus.PUBLISHED);
        return p;
    }

    // ---- likePost vote state machine ---------------------------------------

    @Test
    void likePost_like_castsNewUpvote() {
        PostEntity post = publishedPost();
        when(postRepository.findByIdAndDeletedFalse(post.getId())).thenReturn(Optional.of(post));
        when(voteRepository.findByUserIdAndTargetTypeAndTargetId(userId, VoteTargetType.POST, post.getId()))
                .thenReturn(Optional.empty());

        PostLikeResponse response = interactionService.likePost(post.getId(), LikeRequest.TypeEnum.LIKE);

        assertTrue(response.getIsLikedByMe());
        assertFalse(response.getIsDislikedByMe());
        verify(voteRepository).save(any(VoteEntity.class));
        verify(postRepository).refreshVoteCounts(post.getId());
    }

    @Test
    void likePost_dislike_updatesExistingVote() {
        PostEntity post = publishedPost();
        VoteEntity existing = new VoteEntity();
        existing.setVoteType(VoteType.UPVOTE);
        when(postRepository.findByIdAndDeletedFalse(post.getId())).thenReturn(Optional.of(post));
        when(voteRepository.findByUserIdAndTargetTypeAndTargetId(userId, VoteTargetType.POST, post.getId()))
                .thenReturn(Optional.of(existing));

        PostLikeResponse response = interactionService.likePost(post.getId(), LikeRequest.TypeEnum.DISLIKE);

        assertEquals(VoteType.DOWNVOTE, existing.getVoteType());
        assertTrue(response.getIsDislikedByMe());
        verify(voteRepository).save(existing);
    }

    @Test
    void likePost_none_removesExistingVote() {
        PostEntity post = publishedPost();
        VoteEntity existing = new VoteEntity();
        existing.setVoteType(VoteType.UPVOTE);
        when(postRepository.findByIdAndDeletedFalse(post.getId())).thenReturn(Optional.of(post));
        when(voteRepository.findByUserIdAndTargetTypeAndTargetId(userId, VoteTargetType.POST, post.getId()))
                .thenReturn(Optional.of(existing));

        PostLikeResponse response = interactionService.likePost(post.getId(), LikeRequest.TypeEnum.NONE);

        assertFalse(response.getIsLikedByMe());
        assertFalse(response.getIsDislikedByMe());
        verify(voteRepository).delete(existing);
    }

    @Test
    void likePost_draftByNonAuthor_throwsNotFound() {
        PostEntity draft = publishedPost();
        draft.setStatus(PostStatus.DRAFT);
        when(postRepository.findByIdAndDeletedFalse(draft.getId())).thenReturn(Optional.of(draft));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> interactionService.likePost(draft.getId(), LikeRequest.TypeEnum.LIKE));

        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void likePost_missingPost_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(postRepository.findByIdAndDeletedFalse(id)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> interactionService.likePost(id, LikeRequest.TypeEnum.LIKE));

        assertEquals(404, ex.getStatusCode().value());
    }

    // ---- likeComment --------------------------------------------------------

    @Test
    void likeComment_addsUpvote() {
        CommentEntity comment = new CommentEntity();
        comment.setId(UUID.randomUUID());
        when(commentRepository.findByIdAndDeletedFalse(comment.getId())).thenReturn(Optional.of(comment));

        var response = interactionService.likeComment(comment.getId());

        assertTrue(response.getIsLikedByMe());
        verify(voteRepository).save(any(VoteEntity.class));
        verify(commentRepository).refreshLikeCount(comment.getId());
    }

    @Test
    void likeComment_missingComment_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(commentRepository.findByIdAndDeletedFalse(id)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> interactionService.likeComment(id));

        assertEquals(404, ex.getStatusCode().value());
    }

    // ---- bookmark idempotency ----------------------------------------------

    @Test
    void bookmarkPost_new_savesBookmarkAndRefreshesCount() {
        PostEntity post = publishedPost();
        when(postRepository.findByIdAndDeletedFalse(post.getId())).thenReturn(Optional.of(post));
        when(bookmarkRepository.findByUserIdAndPost_Id(userId, post.getId())).thenReturn(Optional.empty());

        interactionService.bookmarkPost(post.getId());

        verify(bookmarkRepository).save(any(BookmarkEntity.class));
        verify(postRepository).refreshSaveCount(post.getId());
    }

    @Test
    void bookmarkPost_alreadyBookmarked_doesNotSaveAgain() {
        PostEntity post = publishedPost();
        when(postRepository.findByIdAndDeletedFalse(post.getId())).thenReturn(Optional.of(post));
        when(bookmarkRepository.findByUserIdAndPost_Id(userId, post.getId()))
                .thenReturn(Optional.of(new BookmarkEntity()));

        interactionService.bookmarkPost(post.getId());

        verify(bookmarkRepository, never()).save(any());
        verify(postRepository).refreshSaveCount(post.getId());
    }

    @Test
    void unbookmarkPost_existing_deletesBookmark() {
        PostEntity post = publishedPost();
        BookmarkEntity bookmark = new BookmarkEntity();
        when(postRepository.findByIdAndDeletedFalse(post.getId())).thenReturn(Optional.of(post));
        when(bookmarkRepository.findByUserIdAndPost_Id(userId, post.getId())).thenReturn(Optional.of(bookmark));

        interactionService.unbookmarkPost(post.getId());

        verify(bookmarkRepository).delete(bookmark);
        verify(postRepository).refreshSaveCount(post.getId());
    }

    @Test
    void unbookmarkPost_notBookmarked_isNoOp() {
        PostEntity post = publishedPost();
        when(postRepository.findByIdAndDeletedFalse(post.getId())).thenReturn(Optional.of(post));
        when(bookmarkRepository.findByUserIdAndPost_Id(userId, post.getId())).thenReturn(Optional.empty());

        interactionService.unbookmarkPost(post.getId());

        verify(bookmarkRepository, never()).delete(any());
        verify(postRepository).refreshSaveCount(post.getId());
    }
}
