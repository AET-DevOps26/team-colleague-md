package com.verita.contentservice.service;
import com.verita.contentservice.BookmarkEntity;
import com.verita.contentservice.CommentEntity;
import com.verita.contentservice.PostEntity;
import com.verita.contentservice.PostStatus;
import com.verita.contentservice.TagEntity;
import com.verita.contentservice.VoteEntity;
import com.verita.contentservice.VoteTargetType;
import com.verita.contentservice.VoteType;
import com.verita.contentservice.dto.UserPreferencesDto;
import com.verita.contentservice.dto.UserProfileDto;
import com.verita.contentservice.repository.BookmarkRepository;
import com.verita.contentservice.repository.CommentRepository;
import com.verita.contentservice.repository.PostRepository;
import com.verita.contentservice.repository.TagRepository;
import com.verita.contentservice.repository.VoteRepository;
import com.verita.contentservice.support.Clients;
import com.verita.model.AuthorSummary;
import com.verita.model.CommentLikeResponse;
import com.verita.model.CommentRequest;
import com.verita.model.CommentResponse;
import com.verita.model.LikeRequest;
import com.verita.model.PostCard;
import com.verita.model.PostLikeResponse;
import com.verita.model.PostPage;
import com.verita.model.PostRequest;
import com.verita.model.PostResponse;
import com.verita.model.Tag;
import com.verita.model.TagResponse;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
@Transactional
public class ContentService {
    private final PostRepository postRepository;
    private final TagRepository tagRepository;
    private final CommentRepository commentRepository;
    private final VoteRepository voteRepository;
    private final BookmarkRepository bookmarkRepository;
    private final Clients clients;

    public ContentService(PostRepository postRepository, TagRepository tagRepository, CommentRepository commentRepository, VoteRepository voteRepository, BookmarkRepository bookmarkRepository, Clients clients) {
        this.postRepository = postRepository;
        this.tagRepository = tagRepository;
        this.commentRepository = commentRepository;
        this.voteRepository = voteRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.clients = clients;
    }

    public PostResponse createPost(PostRequest request, String authorization) {
        UUID userId = currentUserId(authorization);
        PostEntity post = new PostEntity();
        post.setAuthorId(userId);
        applyPostRequest(post, request);
        post = postRepository.save(post);
        post.setContentSummary(generateSummary(authorization, post));
        post = postRepository.save(post);
        return toPostResponse(post, userId);
    }

    public PostResponse updatePost(UUID id, PostRequest request, String authorization) {
        UUID userId = currentUserId(authorization);
        PostEntity post = mustOwnEditablePost(id, userId);
        applyPostRequest(post, request);
        post = postRepository.save(post);
        post.setContentSummary(generateSummary(authorization, post));
        post = postRepository.save(post);
        return toPostResponse(post, userId);
    }

    public void deletePost(UUID id, String authorization) {
        UUID userId = currentUserId(authorization);
        PostEntity post = mustOwnEditablePost(id, userId);
        post.setDeleted(true);
        post.setDeletedAt(OffsetDateTime.now());
        postRepository.save(post);
    }

    @Transactional(readOnly = true)
    public PostPage getAllPosts(int page, int size, String tag, String authorization) {
        PageRequest pageable = PageRequest.of(page, clampSize(size));
        UUID currentUser = optionalUserId(authorization);
        Page<PostEntity> result = (tag == null || tag.isBlank())
                ? postRepository.findByDeletedFalseAndStatusOrderByCreatedAtDesc(PostStatus.PUBLISHED, pageable)
                : postRepository.findByDeletedFalseAndStatusAndTags_NameIgnoreCaseOrderByCreatedAtDesc(PostStatus.PUBLISHED, tag, pageable);
        return mapPage(result, currentUser);
    }

    @Transactional(readOnly = true)
    public PostPage searchPosts(String q, int page, int size, String authorization) {
        return mapPage(postRepository.searchPublished(q, PageRequest.of(page, clampSize(size))), optionalUserId(authorization));
    }

    public PostResponse getPost(UUID id, String authorization) {
        UUID currentUser = optionalUserId(authorization);
        PostEntity post = postRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), currentUser)) {
            throw new ResponseStatusException(NOT_FOUND);
        }
        postRepository.incrementViewCount(post.getId());
        return toPostResponse(post, currentUser);
    }

    @Transactional(readOnly = true)
    public PostPage getUserBookmarks(UUID userId, int page, int size, String authorization) {
        UUID current = optionalUserId(authorization);
        if (!Objects.equals(current, userId)) {
            UserPreferencesDto prefs = null;
            try { prefs = clients.getUserPreferences(userId); } catch (Exception ignored) {}
            if (prefs == null || !Boolean.TRUE.equals(prefs.showBookmarks())) {
                throw new ResponseStatusException(FORBIDDEN);
            }
        }
        return mapPage(postRepository.findBookmarkedPublishedPostsByUserId(userId, PageRequest.of(page, clampSize(size))), current);
    }

    @Transactional(readOnly = true)
    public PostPage getUserLikes(UUID userId, int page, int size, String authorization) {
        UUID current = optionalUserId(authorization);
        if (!Objects.equals(current, userId)) {
            UserPreferencesDto prefs = null;
            try { prefs = clients.getUserPreferences(userId); } catch (Exception ignored) {}
            if (prefs == null || !Boolean.TRUE.equals(prefs.showLikes())) {
                throw new ResponseStatusException(FORBIDDEN);
            }
        }
        return mapPage(postRepository.findLikedPublishedPostsByUserId(userId, PageRequest.of(page, clampSize(size))), current);
    }

    @Transactional(readOnly = true)
    public PostPage getUserPosts(UUID userId, int page, int size, String authorization) {
        return mapPage(postRepository.findByDeletedFalseAndAuthorIdAndStatusOrderByCreatedAtDesc(userId, PostStatus.PUBLISHED, PageRequest.of(page, clampSize(size))), optionalUserId(authorization));
    }

    @Transactional(readOnly = true)
    public PostPage getMyDrafts(int page, int size, String authorization) {
        UUID userId = currentUserId(authorization);
        return mapPage(postRepository.findByDeletedFalseAndAuthorIdAndStatusOrderByCreatedAtDesc(userId, PostStatus.DRAFT, PageRequest.of(page, clampSize(size))), userId);
    }

    public CommentResponse addComment(UUID postId, CommentRequest request, String authorization) {
        UUID userId = currentUserId(authorization);
        PostEntity post = postRepository.findByIdAndDeletedFalse(postId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), userId)) throw new ResponseStatusException(NOT_FOUND);
        CommentEntity comment = new CommentEntity();
        comment.setPost(post);
        comment.setAuthorId(userId);
        comment.setText(request.getText());
        if (request.getParentId() != null && request.getParentId().isPresent()) {
            comment.setParentComment(commentRepository.findByIdAndDeletedFalse(request.getParentId().get()).orElseThrow(() -> new ResponseStatusException(NOT_FOUND)));
        }
        comment = commentRepository.save(comment);
        postRepository.incrementCommentCount(post.getId());
        return toCommentResponse(comment, userId, List.of());
    }

    public List<CommentResponse> getComments(UUID postId, String authorization) {
        UUID userId = optionalUserId(authorization);
        PostEntity post = postRepository.findByIdAndDeletedFalse(postId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), userId)) throw new ResponseStatusException(NOT_FOUND);
        return buildCommentTree(postId, userId);
    }

    public void deleteComment(UUID id, String authorization) {
        UUID userId = currentUserId(authorization);
        CommentEntity comment = commentRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (!Objects.equals(comment.getAuthorId(), userId)) throw new ResponseStatusException(FORBIDDEN);
        comment.setDeleted(true);
        comment.setDeletedAt(OffsetDateTime.now());
        comment.setText("[deleted]");
        commentRepository.save(comment);
    }

    public CommentLikeResponse likeComment(UUID id, String authorization) {
        UUID userId = currentUserId(authorization);
        commentRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        applyVote(userId, VoteTargetType.COMMENT, id, VoteType.UPVOTE);
        commentRepository.refreshLikeCount(id);
        CommentEntity updated = commentRepository.findByIdAndDeletedFalse(id).orElseThrow();
        return new CommentLikeResponse().likeCount((int) updated.getLikeCount()).isLikedByMe(true);
    }

    public PostLikeResponse likePost(UUID id, LikeRequest.TypeEnum type, String authorization) {
        UUID userId = currentUserId(authorization);
        PostEntity post = postRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), userId)) throw new ResponseStatusException(NOT_FOUND);
        VoteType newType = switch (type) {
            case LIKE -> VoteType.UPVOTE;
            case DISLIKE -> VoteType.DOWNVOTE;
            case NONE -> null;
        };
        applyVote(userId, VoteTargetType.POST, post.getId(), newType);
        postRepository.refreshVoteCounts(post.getId());
        PostEntity updated = postRepository.findByIdAndDeletedFalse(post.getId()).orElseThrow();
        return new PostLikeResponse().likeCount((int) updated.getLikeCount()).dislikeCount((int) updated.getDislikeCount()).isLikedByMe(newType == VoteType.UPVOTE).isDislikedByMe(newType == VoteType.DOWNVOTE);
    }

    public void bookmarkPost(UUID id, String authorization) {
        UUID userId = currentUserId(authorization);
        PostEntity post = postRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), userId)) throw new ResponseStatusException(NOT_FOUND);
        var existing = bookmarkRepository.findByUserIdAndPost_Id(userId, id);
        if (existing.isEmpty()) {
            BookmarkEntity bookmark = new BookmarkEntity();
            bookmark.setUserId(userId);
            bookmark.setPost(post);
            bookmarkRepository.save(bookmark);
        }
        postRepository.refreshSaveCount(id);
    }

    public void unbookmarkPost(UUID id, String authorization) {
        UUID userId = currentUserId(authorization);
        postRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        var existing = bookmarkRepository.findByUserIdAndPost_Id(userId, id);
        existing.ifPresent(bookmarkRepository::delete);
        postRepository.refreshSaveCount(id);
    }

    @Transactional(readOnly = true)
    public List<TagResponse> trendingTags() {
        return tagRepository.findTop10ByOrderByUsageCountDesc().stream().map(t -> new TagResponse().id(t.getId()).name(t.getName()).usageCount((int) t.getUsageCount())).toList();
    }

    @Transactional(readOnly = true)
    public List<PostCard> getCards(List<UUID> ids, String authorization) {
        if (ids.size() > 50) throw new ResponseStatusException(BAD_REQUEST, "max 50 ids");
        Map<UUID, PostEntity> postsMap = postRepository.findByIdInAndDeletedFalse(new LinkedHashSet<>(ids)).stream()
                .filter(p -> p.getStatus() == PostStatus.PUBLISHED)
                .collect(Collectors.toMap(PostEntity::getId, Function.identity()));
        UUID userId = optionalUserId(authorization);
        List<PostEntity> ordered = ids.stream().map(postsMap::get).filter(Objects::nonNull).toList();
        if (ordered.isEmpty()) return List.of();
        List<UUID> postIds = ordered.stream().map(PostEntity::getId).toList();
        Map<UUID, VoteEntity> votesByPostId = userId == null ? Map.of() :
                voteRepository.findByUserIdAndTargetTypeAndTargetIdIn(userId, VoteTargetType.POST, postIds)
                        .stream().collect(Collectors.toMap(VoteEntity::getTargetId, Function.identity()));
        Map<UUID, UserProfileDto> authors = clients.getUsersByIds(
                ordered.stream().map(PostEntity::getAuthorId).collect(Collectors.toSet()));
        return ordered.stream()
                .map(p -> toCard(p, userId, votesByPostId.get(p.getId()), authors.get(p.getAuthorId())))
                .toList();
    }

    private void applyPostRequest(PostEntity post, PostRequest request) {
        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setExcerpt(request.getExcerpt() != null ? request.getExcerpt() : summarizeLocally(request.getContent()));
        post.setCoverImageUrl(request.getCoverImageUrl() != null && request.getCoverImageUrl().isPresent() && request.getCoverImageUrl().get() != null ? request.getCoverImageUrl().get().toString() : null);
        post.setSourceUrls(request.getSourceUrl() == null ? new ArrayList<>() : request.getSourceUrl().stream().map(URI::toString).toList());
        post.setStatus(request.getStatus() == PostRequest.StatusEnum.DRAFT ? PostStatus.DRAFT : PostStatus.PUBLISHED);

        Set<TagEntity> oldTags = post.getTags() != null ? new LinkedHashSet<>(post.getTags()) : new LinkedHashSet<>();
        Set<UUID> oldTagIds = oldTags.stream().map(TagEntity::getId).collect(Collectors.toSet());

        Set<TagEntity> newTags = new LinkedHashSet<>();
        if (request.getTags() != null) {
            for (String name : request.getTags()) {
                newTags.add(tagRepository.findByNameIgnoreCase(name).orElseGet(() -> {
                    TagEntity t = new TagEntity();
                    t.setName(name);
                    return tagRepository.save(t);
                }));
            }
        }
        Set<UUID> newTagIds = newTags.stream().map(TagEntity::getId).collect(Collectors.toSet());

        post.setTags(newTags);

        for (TagEntity tag : oldTags) {
            if (!newTagIds.contains(tag.getId())) {
                tag.setUsageCount(Math.max(0, tag.getUsageCount() - 1));
                tagRepository.save(tag);
            }
        }
        for (TagEntity tag : newTags) {
            if (!oldTagIds.contains(tag.getId())) {
                tag.setUsageCount(tag.getUsageCount() + 1);
                tagRepository.save(tag);
            }
        }
    }

    private String generateSummary(String authorization, PostEntity post) {
        try {
            return String.join("\n", clients.summarize(authorization, post.getId() == null ? UUID.randomUUID() : post.getId(), post.getTitle(), post.getContent()).summary());
        } catch (Exception e) {
            return summarizeLocally(post.getContent());
        }
    }

    private String summarizeLocally(String content) {
        return content == null ? "" : (content.length() <= 240 ? content : content.substring(0, 240));
    }

    private UUID currentUserId(String authorization) {
        return requireCurrentUser(authorization).id();
    }

    private UUID optionalUserId(String authorization) {
        try {
            return requireCurrentUser(authorization).id();
        } catch (Exception e) {
            return null;
        }
    }

    private UserProfileDto requireCurrentUser(String authorization) {
        if (authorization == null || authorization.isBlank()) throw new ResponseStatusException(UNAUTHORIZED);
        return clients.getCurrentUser(authorization);
    }

    private PostEntity mustOwnEditablePost(UUID id, UUID userId) {
        PostEntity post = postRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (!Objects.equals(post.getAuthorId(), userId)) throw new ResponseStatusException(FORBIDDEN);
        return post;
    }

    private void applyVote(UUID userId, VoteTargetType targetType, UUID targetId, VoteType newType) {
        var existing = voteRepository.findByUserIdAndTargetTypeAndTargetId(userId, targetType, targetId);
        if (newType == null) {
            existing.ifPresent(voteRepository::delete);
            return;
        }
        if (existing.isPresent()) {
            existing.get().setVoteType(newType);
            voteRepository.save(existing.get());
        } else {
            VoteEntity vote = new VoteEntity();
            vote.setUserId(userId);
            vote.setTargetType(targetType);
            vote.setTargetId(targetId);
            vote.setVoteType(newType);
            voteRepository.save(vote);
        }
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
        Map<UUID, UserProfileDto> authors = clients.getUsersByIds(
                posts.stream().map(PostEntity::getAuthorId).collect(Collectors.toSet()));
        return new PostPage()
                .content(posts.stream().map(p -> toPostResponse(p, currentUser,
                        votesByPostId.get(p.getId()),
                        bookmarkedIds.contains(p.getId()),
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
                .content(post.getContent())
                .tags(post.getTags().stream().map(this::toApiTag).toList())
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
                .content(post.getContent())
                .tags(post.getTags().stream().map(this::toApiTag).toList())
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

    private CommentResponse toCommentResponse(CommentEntity comment, UUID currentUser, List<CommentResponse> replies) {
        return new CommentResponse().id(comment.getId()).author(authorSummary(comment.getAuthorId())).text(comment.getText()).likeCount((int) comment.getLikeCount()).isLikedByMe(currentUser != null && voteRepository.findByUserIdAndTargetTypeAndTargetId(currentUser, VoteTargetType.COMMENT, comment.getId()).isPresent()).createdAt(comment.getCreatedAt()).replies(replies);
    }

    private CommentResponse toCommentNode(CommentEntity comment, Map<UUID, List<CommentEntity>> children, Set<UUID> likedCommentIds) {
        return new CommentResponse().id(comment.getId()).author(authorSummary(comment.getAuthorId())).text(comment.getText()).likeCount((int) comment.getLikeCount()).isLikedByMe(likedCommentIds.contains(comment.getId())).createdAt(comment.getCreatedAt()).replies(children.getOrDefault(comment.getId(), List.of()).stream().map(c -> toCommentNode(c, children, likedCommentIds)).toList());
    }

    private List<CommentResponse> buildCommentTree(UUID postId, UUID currentUser) {
        Map<UUID, List<CommentEntity>> children = new LinkedHashMap<>();
        List<CommentEntity> allComments = commentRepository.findByPost_IdAndDeletedFalseOrderByCreatedAtAsc(postId);
        for (CommentEntity comment : allComments) {
            UUID parentId = comment.getParentComment() == null ? null : comment.getParentComment().getId();
            children.computeIfAbsent(parentId, k -> new ArrayList<>()).add(comment);
        }
        Set<UUID> likedCommentIds = Set.of();
        if (currentUser != null && !allComments.isEmpty()) {
            List<UUID> commentIds = allComments.stream().map(CommentEntity::getId).toList();
            likedCommentIds = voteRepository.findByUserIdAndTargetTypeAndTargetIdIn(currentUser, VoteTargetType.COMMENT, commentIds)
                    .stream().map(VoteEntity::getTargetId).collect(Collectors.toSet());
        }
        final Set<UUID> finalLikedIds = likedCommentIds;
        return children.getOrDefault(null, List.of()).stream().map(c -> toCommentNode(c, children, finalLikedIds)).toList();
    }

    private AuthorSummary authorSummary(UUID userId) {
        UserProfileDto u = null;
        try { u = clients.getUserById(userId); } catch (Exception ignored) {}
        return authorSummary(userId, u);
    }

    private AuthorSummary authorSummary(UUID userId, UserProfileDto u) {
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

    private Tag toApiTag(TagEntity entity) {
        return new Tag().id(entity.getId()).name(entity.getName());
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
        if (post.getTags() != null) card.setTags(post.getTags().stream().map(this::toApiTag).toList());
        if (post.getContent() != null) card.readTimeMinutes(readTime(post.getContent()));
        return card;
    }

    private int readTime(String content) {
        return Math.max(1, (content == null ? 0 : content.split("\\s+").length) / 200 + 1);
    }

    private static int clampSize(int size) {
        return Math.min(size, 100);
    }
}
