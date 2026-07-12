package com.verita.contentservice.service;

import com.verita.contentservice.client.UserClient;
import com.verita.contentservice.dto.UserPreferencesDto;
import com.verita.contentservice.dto.UserProfileDto;
import com.verita.contentservice.entity.PostEntity;
import com.verita.contentservice.entity.PostStatus;
import com.verita.contentservice.entity.SummaryStatus;
import com.verita.contentservice.entity.TopicEntity;
import com.verita.contentservice.entity.VoteEntity;
import com.verita.contentservice.entity.VoteTargetType;
import com.verita.contentservice.entity.VoteType;
import com.verita.contentservice.repository.BookmarkRepository;
import com.verita.contentservice.repository.PostRepository;
import com.verita.contentservice.repository.TopicRepository;
import com.verita.contentservice.repository.VoteRepository;
import com.verita.contentservice.security.SecurityUtils;
import com.verita.model.AuthorSummary;
import com.verita.model.PostCard;
import com.verita.model.PostPage;
import com.verita.model.PostPatchRequest;
import com.verita.model.PostRequest;
import com.verita.model.PostResponse;
import com.verita.model.PostSummaryResponse;
import com.verita.model.Topic;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@Validated
@Transactional
@Slf4j
@RequiredArgsConstructor
public class PostService {
    private static final int MAX_PAGE_SIZE = 100;
    private static final int MIN_SUMMARY_CONTENT_LENGTH = 50;
    private final PostRepository postRepository;
    private final TopicRepository topicRepository;
    private final VoteRepository voteRepository;
    private final BookmarkRepository bookmarkRepository;
    private final UserClient userClient;
    private final SecurityUtils securityUtils;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Creates a post or draft and queues AI summary generation when the content is eligible.
     */
    public PostResponse createPost(@Valid PostRequest request) {
        UUID userId = currentUserId();
        PostEntity post = new PostEntity();
        post.setAuthorId(userId);
        applyPostRequest(post, request);
        applySummaryStateForContent(post);
        post = postRepository.save(post);
        applyAuthorStatsDelta(post, false, post.getStatus() == PostStatus.PUBLISHED);
        publishSummaryRequestIfPending(post);
        return toPostResponse(post, userId);
    }

    /**
     * Fully replaces editable post fields; only an actual content change queues summary regeneration.
     */
    public PostResponse updatePost(UUID id, @Valid PostRequest request) {
        UUID userId = currentUserId();
        PostEntity post = mustOwnEditablePost(id, userId);
        boolean wasPublished = post.getStatus() == PostStatus.PUBLISHED;
        boolean contentChanged = !Objects.equals(post.getContent(), request.getContent());
        applyPostRequest(post, request);
        if (contentChanged) {
            applySummaryStateForContent(post);
        }
        post = postRepository.save(post);
        applyAuthorStatsDelta(post, wasPublished, post.getStatus() == PostStatus.PUBLISHED);
        if (contentChanged) {
            publishSummaryRequestIfPending(post);
        }
        return toPostResponse(post, userId);
    }

    /**
     * Partially updates editable post fields; only an actual content change queues summary regeneration.
     */
    public PostResponse patchPost(UUID id, @Valid PostPatchRequest request) {
        UUID userId = currentUserId();
        PostEntity post = mustOwnEditablePost(id, userId);
        boolean wasPublished = post.getStatus() == PostStatus.PUBLISHED;
        boolean contentChanged = false;
        if (request.getTitle() != null) {
            post.setTitle(request.getTitle());
        }
        if (request.getContent() != null) {
            contentChanged = !Objects.equals(post.getContent(), request.getContent());
            post.setContent(request.getContent());
            if (contentChanged) {
                applySummaryStateForContent(post);
            }
        }
        if (request.getExcerpt() != null && request.getExcerpt().isPresent()) {
            post.setExcerpt(request.getExcerpt().get());
        }
        if (request.getCoverImageUrl() != null && request.getCoverImageUrl().isPresent()) {
            URI coverImageUrl = request.getCoverImageUrl().get();
            post.setCoverImageUrl(coverImageUrl == null ? null : coverImageUrl.toString());
        }
        if (request.getSourceUrl() != null) {
            post.setSourceUrls(request.getSourceUrl().stream().map(URI::toString).toList());
        }
        if (request.getStatus() != null) {
            post.setStatus(request.getStatus() == PostPatchRequest.StatusEnum.DRAFT
                    ? PostStatus.DRAFT : PostStatus.PUBLISHED);
        }
        if (request.getTopics() != null) {
            applyTopics(post, request.getTopics());
        }
        post = postRepository.save(post);
        applyAuthorStatsDelta(post, wasPublished, post.getStatus() == PostStatus.PUBLISHED);
        if (contentChanged) {
            publishSummaryRequestIfPending(post);
        }
        return toPostResponse(post, userId);
    }

    public void deletePost(UUID id) {
        UUID userId = currentUserId();
        PostEntity post = mustOwnEditablePost(id, userId);
        boolean wasPublished = post.getStatus() == PostStatus.PUBLISHED;
        post.setDeleted(true);
        post.setDeletedAt(OffsetDateTime.now());
        postRepository.save(post);
        if (wasPublished && post.getTopics() != null) {
            post.getTopics().forEach(t -> topicRepository.decrementTotalPostCount(t.getId()));
        }
        applyAuthorStatsDelta(post, wasPublished, false);
    }

    @Transactional(readOnly = true)
    public PostPage getAllPosts(int page, int size, String topic) {
        PageRequest pageable = PageRequest.of(page, clampPageSize(size));
        UUID currentUser = optionalUserId();
        Page<PostEntity> result = (topic == null || topic.isBlank())
                ? postRepository.findByDeletedFalseAndStatusOrderByCreatedAtDesc(PostStatus.PUBLISHED, pageable)
                : postRepository.findByDeletedFalseAndStatusAndTopics_NameIgnoreCaseOrderByCreatedAtDesc(PostStatus.PUBLISHED, topic, pageable);
        return mapPage(result, currentUser);
    }

    @Transactional(readOnly = true)
    public PostPage searchPosts(String q, int page, int size) {
        return mapPage(postRepository.searchPublished(q, PageRequest.of(page, clampPageSize(size))), optionalUserId());
    }

    public PostResponse getPost(UUID id) {
        UUID currentUser = optionalUserId();
        PostEntity post = visiblePostOrNotFound(id, currentUser);
        // Build the response while the entity is still attached: incrementViewCount runs a
        // clearAutomatically update that detaches `post`, after which its lazy topics/sourceUrls
        // collections could no longer be initialised (open-in-view is disabled).
        PostResponse response = toPostResponse(post, currentUser);
        postRepository.incrementViewCount(post.getId());
        return response;
    }

    /**
     * Returns the AI summary state for a visible post without incrementing view counters.
     */
    @Transactional(readOnly = true)
    public PostSummaryResponse getPostSummary(UUID id) {
        PostEntity post = visiblePostOrNotFound(id, optionalUserId());
        return toPostSummaryResponse(post);
    }

    @Transactional(readOnly = true)
    public PostPage getUserBookmarks(UUID userId, int page, int size) {
        UUID current = optionalUserId();
        if (!Objects.equals(current, userId)) {
            UserPreferencesDto prefs = null;
            try { prefs = userClient.getUserPreferences(userId); } catch (Exception ignored) {}
            if (prefs == null || !Boolean.TRUE.equals(prefs.showBookmarks())) {
                throw new ResponseStatusException(FORBIDDEN);
            }
        }
        return mapPage(postRepository.findBookmarkedPublishedPostsByUserId(userId, PageRequest.of(page, clampPageSize(size))), current);
    }

    @Transactional(readOnly = true)
    public PostPage getUserLikes(UUID userId, int page, int size) {
        UUID current = optionalUserId();
        if (!Objects.equals(current, userId)) {
            UserPreferencesDto prefs = null;
            try { prefs = userClient.getUserPreferences(userId); } catch (Exception ignored) {}
            if (prefs == null || !Boolean.TRUE.equals(prefs.showLikes())) {
                throw new ResponseStatusException(FORBIDDEN);
            }
        }
        return mapPage(postRepository.findLikedPublishedPostsByUserId(userId, PageRequest.of(page, clampPageSize(size))), current);
    }

    @Transactional(readOnly = true)
    public PostPage getUserPosts(UUID userId, int page, int size) {
        return mapPage(postRepository.findByDeletedFalseAndAuthorIdAndStatusOrderByCreatedAtDesc(
                userId, PostStatus.PUBLISHED, PageRequest.of(page, clampPageSize(size))), optionalUserId());
    }

    @Transactional(readOnly = true)
    public PostPage getMyDrafts(int page, int size) {
        UUID userId = currentUserId();
        return mapPage(postRepository.findByDeletedFalseAndAuthorIdAndStatusOrderByCreatedAtDesc(
                userId, PostStatus.DRAFT, PageRequest.of(page, clampPageSize(size))), userId);
    }

    @Transactional(readOnly = true)
    public List<PostCard> getCards(List<UUID> ids) {
        if (ids.size() > 50) throw new ResponseStatusException(BAD_REQUEST, "max 50 ids");
        Map<UUID, PostEntity> postsMap = postRepository.findByIdInAndDeletedFalse(new LinkedHashSet<>(ids)).stream()
                .filter(p -> p.getStatus() == PostStatus.PUBLISHED)
                .collect(Collectors.toMap(PostEntity::getId, Function.identity()));
        UUID userId = optionalUserId();
        List<PostEntity> ordered = ids.stream().map(postsMap::get).filter(Objects::nonNull).toList();
        if (ordered.isEmpty()) return List.of();
        List<UUID> postIds = ordered.stream().map(PostEntity::getId).toList();
        Map<UUID, VoteEntity> votesByPostId = userId == null ? Map.of() :
                voteRepository.findByUserIdAndTargetTypeAndTargetIdIn(userId, VoteTargetType.POST, postIds)
                        .stream().collect(Collectors.toMap(VoteEntity::getTargetId, Function.identity()));
        Map<UUID, UserProfileDto> authors = userClient.getUsersByIds(
                ordered.stream().map(PostEntity::getAuthorId).collect(Collectors.toSet()));
        return ordered.stream()
                .map(p -> toCard(p, userId, votesByPostId.get(p.getId()), authors.get(p.getAuthorId())))
                .toList();
    }

    private void applySummaryStateForContent(PostEntity post) {
        if (!isSummaryEligible(post.getContent())) {
            post.setSummaryStatus(SummaryStatus.NONE);
            post.setContentSummary(null);
            post.setSummaryGeneratedAt(null);
            post.setSummaryModel(null);
            return;
        }
        post.setSummaryStatus(SummaryStatus.PENDING);
    }

    private boolean isSummaryEligible(String content) {
        return content != null && content.length() >= MIN_SUMMARY_CONTENT_LENGTH;
    }

    private void publishSummaryRequestIfPending(PostEntity post) {
        if (post.getSummaryStatus() == SummaryStatus.PENDING) {
            eventPublisher.publishEvent(new PostSummaryRequestedEvent(post.getId(), post.getTitle(), post.getContent()));
        }
    }

    private void applyPostRequest(PostEntity post, PostRequest request) {
        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setExcerpt(request.getExcerpt() != null ? request.getExcerpt() : summarizeLocally(request.getContent()));
        post.setCoverImageUrl(request.getCoverImageUrl() != null && request.getCoverImageUrl().isPresent()
                && request.getCoverImageUrl().get() != null ? request.getCoverImageUrl().get().toString() : null);
        post.setSourceUrls(request.getSourceUrl() == null ? new ArrayList<>()
                : request.getSourceUrl().stream().map(URI::toString).toList());
        post.setStatus(request.getStatus() == PostRequest.StatusEnum.DRAFT ? PostStatus.DRAFT : PostStatus.PUBLISHED);
        applyTopics(post, request.getTopics() == null ? List.of() : request.getTopics());
    }

    private void applyTopics(PostEntity post, List<String> topicNames) {
        Set<TopicEntity> oldTopics = post.getTopics() != null ? new LinkedHashSet<>(post.getTopics()) : new LinkedHashSet<>();
        Set<UUID> oldTopicIds = oldTopics.stream().map(TopicEntity::getId).collect(Collectors.toSet());

        Set<TopicEntity> newTopics = new LinkedHashSet<>();
        for (String name : topicNames) {
            newTopics.add(topicRepository.findByNameIgnoreCase(name).orElseGet(() -> {
                TopicEntity t = new TopicEntity();
                t.setName(name);
                return topicRepository.save(t);
            }));
        }
        Set<UUID> newTopicIds = newTopics.stream().map(TopicEntity::getId).collect(Collectors.toSet());
        post.setTopics(newTopics);

        if (post.getStatus() == PostStatus.PUBLISHED) {
            for (TopicEntity topic : oldTopics) {
                if (!newTopicIds.contains(topic.getId())) topicRepository.decrementTotalPostCount(topic.getId());
            }
            for (TopicEntity topic : newTopics) {
                if (!oldTopicIds.contains(topic.getId())) topicRepository.incrementTotalPostCount(topic.getId());
            }
        }
    }

    /**
     * Write-back of the author's aggregate profile counts on a publish-state transition (issue #178).
     * Emits the signed change in postCount so drafts and soft-deletes are excluded. Likes are tallied
     * into likeReceivedCount at like-time ({@link InteractionService}); when a published post is
     * unpublished or soft-deleted, its accrued likes must be reversed here or the count inflates
     * permanently. A no-op when the state is unchanged. The event is forwarded to user-service after
     * commit ({@link UserStatsDeltaEventListener}), keeping the HTTP call out of this transaction.
     */
    private void applyAuthorStatsDelta(PostEntity post, boolean wasPublished, boolean isPublished) {
        int postDelta = (isPublished ? 1 : 0) - (wasPublished ? 1 : 0);
        int likeDelta = (wasPublished && !isPublished) ? -(int) post.getLikeCount() : 0;
        if (postDelta != 0 || likeDelta != 0) {
            eventPublisher.publishEvent(new UserStatsDeltaEvent(post.getAuthorId(), postDelta, likeDelta));
        }
    }

    private String summarizeLocally(String content) {
        return content == null ? "" : (content.length() <= 240 ? content : content.substring(0, 240));
    }

    private UUID currentUserId() {
        return securityUtils.getCurrentUserId();
    }

    private UUID optionalUserId() {
        return securityUtils.getCurrentUserIdOptional().orElse(null);
    }

    private PostEntity mustOwnEditablePost(UUID id, UUID userId) {
        PostEntity post = postRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (!Objects.equals(post.getAuthorId(), userId)) throw new ResponseStatusException(FORBIDDEN);
        return post;
    }

    private PostEntity visiblePostOrNotFound(UUID id, UUID currentUser) {
        PostEntity post = postRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), currentUser)) {
            throw new ResponseStatusException(NOT_FOUND);
        }
        return post;
    }

    private PostPage mapPage(Page<PostEntity> page, UUID currentUser) {
        List<PostEntity> posts = page.getContent();
        if (posts.isEmpty()) {
            return new PostPage().content(List.of()).page(page.getNumber()).size(page.getSize())
                    .totalPages(page.getTotalPages()).totalElements((int) page.getTotalElements());
        }
        List<UUID> postIds = posts.stream().map(PostEntity::getId).toList();
        Map<UUID, VoteEntity> votesByPostId = currentUser == null ? Map.of() :
                voteRepository.findByUserIdAndTargetTypeAndTargetIdIn(currentUser, VoteTargetType.POST, postIds)
                        .stream().collect(Collectors.toMap(VoteEntity::getTargetId, Function.identity()));
        Set<UUID> bookmarkedIds = currentUser == null ? Set.of() :
                bookmarkRepository.findByUserIdAndPost_IdIn(currentUser, postIds)
                        .stream().map(b -> b.getPost().getId()).collect(Collectors.toSet());
        Map<UUID, UserProfileDto> authors = userClient.getUsersByIds(
                posts.stream().map(PostEntity::getAuthorId).collect(Collectors.toSet()));
        return new PostPage()
                .content(posts.stream().map(p -> toPostResponse(p, currentUser,
                        votesByPostId.get(p.getId()), bookmarkedIds.contains(p.getId()),
                        authors.get(p.getAuthorId()))).toList())
                .page(page.getNumber()).size(page.getSize())
                .totalPages(page.getTotalPages()).totalElements((int) page.getTotalElements());
    }

    private PostResponse toPostResponse(PostEntity post, UUID currentUser) {
        VoteEntity myVote = currentUser == null ? null :
                voteRepository.findByUserIdAndTargetTypeAndTargetId(currentUser, VoteTargetType.POST, post.getId()).orElse(null);
        PostResponse response = new PostResponse()
                .id(post.getId())
                .author(authorSummary(post.getAuthorId()))
                .status(post.getStatus() == null ? null : PostResponse.StatusEnum.fromValue(post.getStatus().name()))
                .title(post.getTitle())
                .excerpt(post.getExcerpt())
                .summary(post.getContentSummary())
                .summaryStatus(toApiSummaryStatus(post.getSummaryStatus()))
                .summaryGeneratedAt(post.getSummaryGeneratedAt())
                .summaryModel(post.getSummaryModel())
                .content(post.getContent())
                .topics(post.getTopics().stream().map(this::toApiTopic).toList())
                .sourceUrl(post.getSourceUrls() == null ? List.of() : post.getSourceUrls().stream().map(URI::create).toList())
                .readTimeMinutes(readTime(post.getContent()))
                .likeCount((int) post.getLikeCount())
                .dislikeCount((int) post.getDislikeCount())
                .commentCount((int) post.getCommentCount())
                .viewCount((int) post.getViewCount())
                .saveCount((int) post.getSaveCount())
                .isLikedByMe(myVote != null && myVote.getVoteType() == VoteType.UPVOTE)
                .isDislikedByMe(myVote != null && myVote.getVoteType() == VoteType.DOWNVOTE)
                .isBookmarkedByMe(currentUser != null && bookmarkRepository.existsByUserIdAndPost_Id(currentUser, post.getId()))
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt());
        if (post.getCoverImageUrl() != null && !post.getCoverImageUrl().isBlank()) {
            response.coverImageUrl(URI.create(post.getCoverImageUrl()));
        }
        return response;
    }

    private PostResponse toPostResponse(PostEntity post, UUID currentUser,
                                        VoteEntity myVote, boolean bookmarked, UserProfileDto author) {
        boolean liked = myVote != null && myVote.getVoteType() == VoteType.UPVOTE;
        boolean disliked = myVote != null && myVote.getVoteType() == VoteType.DOWNVOTE;
        PostResponse response = new PostResponse()
                .id(post.getId())
                .author(authorSummary(post.getAuthorId(), author))
                .status(post.getStatus() == null ? null : PostResponse.StatusEnum.fromValue(post.getStatus().name()))
                .title(post.getTitle())
                .excerpt(post.getExcerpt())
                .summary(post.getContentSummary())
                .summaryStatus(toApiSummaryStatus(post.getSummaryStatus()))
                .summaryGeneratedAt(post.getSummaryGeneratedAt())
                .summaryModel(post.getSummaryModel())
                .content(post.getContent())
                .topics(post.getTopics().stream().map(this::toApiTopic).toList())
                .sourceUrl(post.getSourceUrls() == null ? List.of() : post.getSourceUrls().stream().map(URI::create).toList())
                .readTimeMinutes(readTime(post.getContent()))
                .likeCount((int) post.getLikeCount())
                .dislikeCount((int) post.getDislikeCount())
                .commentCount((int) post.getCommentCount())
                .viewCount((int) post.getViewCount())
                .saveCount((int) post.getSaveCount())
                .isLikedByMe(liked)
                .isDislikedByMe(disliked)
                .isBookmarkedByMe(bookmarked)
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt());
        if (post.getCoverImageUrl() != null && !post.getCoverImageUrl().isBlank()) {
            response.coverImageUrl(URI.create(post.getCoverImageUrl()));
        }
        return response;
    }

    private PostSummaryResponse toPostSummaryResponse(PostEntity post) {
        return new PostSummaryResponse()
                .status(toApiSummaryStatus(post.getSummaryStatus()))
                .summary(post.getContentSummary())
                .generatedAt(post.getSummaryGeneratedAt())
                .model(post.getSummaryModel());
    }

    private com.verita.model.SummaryStatus toApiSummaryStatus(SummaryStatus status) {
        return com.verita.model.SummaryStatus.fromValue(status.name());
    }

    AuthorSummary authorSummary(UUID userId) {
        UserProfileDto u = null;
        try { u = userClient.getUserById(userId); } catch (Exception e) {
            log.warn("Failed to fetch user {} for author summary: {}", userId, e.getMessage());
        }
        return authorSummary(userId, u);
    }

    AuthorSummary authorSummary(UUID userId, UserProfileDto u) {
        AuthorSummary summary = new AuthorSummary().id(userId)
                .username(u != null && u.username() != null ? u.username() : "unknown")
                .displayName(u != null && u.displayName() != null ? u.displayName() : "Unknown");
        if (u != null) {
            if (u.avatarUrl() != null && !u.avatarUrl().isBlank()) summary.avatarUrl(URI.create(u.avatarUrl()));
            if (u.role() != null && !u.role().isBlank()) {
                try { summary.role(AuthorSummary.RoleEnum.fromValue(u.role())); }
                catch (IllegalArgumentException ignored) {}
            }
            if (u.organisation() != null && !u.organisation().isBlank()) summary.organisation(u.organisation());
        }
        return summary;
    }

    private Topic toApiTopic(TopicEntity entity) {
        return new Topic().id(entity.getId()).name(entity.getName());
    }

    private PostCard toCard(PostEntity post, UUID currentUser, VoteEntity myVote, UserProfileDto author) {
        boolean liked = myVote != null && myVote.getVoteType() == VoteType.UPVOTE;
        PostCard card = new PostCard()
                .id(post.getId())
                .author(authorSummary(post.getAuthorId(), author))
                .title(post.getTitle())
                .likeCount((int) post.getLikeCount())
                .commentCount((int) post.getCommentCount())
                .viewCount((int) post.getViewCount())
                .isLikedByMe(liked)
                .createdAt(post.getCreatedAt());
        if (post.getExcerpt() != null) card.excerpt(post.getExcerpt());
        if (post.getCoverImageUrl() != null && !post.getCoverImageUrl().isBlank()) {
            card.coverImageUrl(URI.create(post.getCoverImageUrl()));
        }
        if (post.getTopics() != null) card.setTopics(post.getTopics().stream().map(this::toApiTopic).toList());
        if (post.getContent() != null) card.readTimeMinutes(readTime(post.getContent()));
        return card;
    }

    private int readTime(String content) {
        return Math.max(1, (content == null ? 0 : content.split("\\s+").length) / 200 + 1);
    }

    static int clampPageSize(int size) {
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
