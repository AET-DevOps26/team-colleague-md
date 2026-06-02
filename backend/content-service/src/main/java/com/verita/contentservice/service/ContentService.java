package com.verita.contentservice.service;
import com.verita.contentservice.*;
import com.verita.contentservice.dto.*;
import com.verita.contentservice.repository.*;
import com.verita.contentservice.support.Clients;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import static org.springframework.http.HttpStatus.*;
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
        this.postRepository = postRepository; this.tagRepository = tagRepository; this.commentRepository = commentRepository; this.voteRepository = voteRepository; this.bookmarkRepository = bookmarkRepository; this.clients = clients;
    }
    public PostResponse createPost(PostRequest request, String authorization) {
        UUID userId = currentUserId(authorization);
        PostEntity post = new PostEntity();
        post.setAuthorId(userId);
        applyPostRequest(post, request);
        post = postRepository.save(post);
        post.setContentSummary(generateSummary(authorization, post));
        post = postRepository.save(post);
        return toPostResponse(post, userId, authorization);
    }
    public PostResponse updatePost(UUID id, PostRequest request, String authorization) {
        UUID userId = currentUserId(authorization);
        PostEntity post = mustOwnEditablePost(id, userId);
        applyPostRequest(post, request);
        post = postRepository.save(post);
        post.setContentSummary(generateSummary(authorization, post));
        return toPostResponse(postRepository.save(post), userId, authorization);
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
        var pageable = PageRequest.of(page, size);
        var currentUser = optionalUserId(authorization);
        var result = (tag == null || tag.isBlank())
                ? postRepository.findByDeletedFalseAndStatusOrderByCreatedAtDesc(PostStatus.PUBLISHED, pageable)
                : postRepository.findByDeletedFalseAndStatusAndTags_NameIgnoreCaseOrderByCreatedAtDesc(PostStatus.PUBLISHED, tag, pageable);
        return mapPage(result, currentUser, authorization);
    }
    @Transactional(readOnly = true)
    public PostPage searchPosts(String q, int page, int size, String authorization) {
        var result = postRepository.searchPublished(q, PageRequest.of(page, size));
        return mapPage(result, optionalUserId(authorization), authorization);
    }

    @Transactional(readOnly = true)
    public PostPage getUserBookmarks(UUID userId, int page, int size, String authorization) {
        UUID current = optionalUserId(authorization);
        if (current == null) throw new ResponseStatusException(UNAUTHORIZED);
        if (!Objects.equals(current, userId)) throw new ResponseStatusException(FORBIDDEN);
        var posts = bookmarkRepository.findByUserId(userId).stream().map(BookmarkEntity::getPost).filter(p -> p != null && !p.isDeleted() && p.getStatus() == PostStatus.PUBLISHED).toList();
        var slice = posts.stream().skip((long) page * size).limit(size).toList();
        return new PostPage(slice.stream().map(p -> toPostResponse(p, current, authorization)).toList(), page, size, Math.max(1, (posts.size() + size - 1) / size), posts.size());
    }

    @Transactional(readOnly = true)
    public PostPage getUserLikes(UUID userId, int page, int size, String authorization) {
        UUID current = optionalUserId(authorization);
        if (current == null) throw new ResponseStatusException(UNAUTHORIZED);
        if (!Objects.equals(current, userId)) throw new ResponseStatusException(FORBIDDEN);
        var posts = voteRepository.findByUserIdAndTargetTypeAndVoteType(userId, VoteTargetType.POST, VoteType.UPVOTE).stream().map(v -> postRepository.findByIdAndDeletedFalse(v.getTargetId()).orElse(null)).filter(Objects::nonNull).filter(p -> p.getStatus() == PostStatus.PUBLISHED).toList();
        var slice = posts.stream().skip((long) page * size).limit(size).toList();
        return new PostPage(slice.stream().map(p -> toPostResponse(p, current, authorization)).toList(), page, size, Math.max(1, (posts.size() + size - 1) / size), posts.size());
    }
    @Transactional(readOnly = true)
    public List<PostCard> getCards(List<UUID> ids, String authorization) {
        if (ids.size() > 50) throw new ResponseStatusException(BAD_REQUEST, "max 50 ids");
        var posts = postRepository.findByIdInAndDeletedFalse(new LinkedHashSet<>(ids)).stream().filter(p -> p.getStatus() == PostStatus.PUBLISHED).collect(Collectors.toMap(PostEntity::getId, Function.identity()));
        UUID userId = optionalUserId(authorization);
        List<PostCard> cards = new ArrayList<>();
        for (UUID id : ids) {
            PostEntity post = posts.get(id);
            if (post != null) cards.add(toCard(post, userId, authorization));
        }
        return cards;
    }
    @Transactional(readOnly = true)
    public PostResponse getPost(UUID id, String authorization) {
        UUID currentUser = optionalUserId(authorization);
        PostEntity post = postRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), currentUser)) throw new ResponseStatusException(NOT_FOUND);
        return toPostResponse(post, currentUser, authorization);
    }
    @Transactional(readOnly = true)
    public PostPage getMyDrafts(int page, int size, String authorization) {
        UUID userId = currentUserId(authorization);
        return mapPage(postRepository.findByDeletedFalseAndAuthorIdAndStatusOrderByCreatedAtDesc(userId, PostStatus.DRAFT, PageRequest.of(page, size)), userId, authorization);
    }
    @Transactional(readOnly = true)
    public PostPage getUserPosts(UUID userId, int page, int size, String authorization) {
        return mapPage(postRepository.findByDeletedFalseAndAuthorIdAndStatusOrderByCreatedAtDesc(userId, PostStatus.PUBLISHED, PageRequest.of(page, size)), optionalUserId(authorization), authorization);
    }
    public PostLikeResponse likePost(UUID id, String type, String authorization) {
        UUID userId = currentUserId(authorization);
        PostEntity post = postRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), userId)) throw new ResponseStatusException(NOT_FOUND);
        VoteType newType = switch (type.toUpperCase(Locale.ROOT)) { case "LIKE" -> VoteType.UPVOTE; case "DISLIKE" -> VoteType.DOWNVOTE; case "NONE" -> null; default -> throw new ResponseStatusException(BAD_REQUEST); };
        applyVote(userId, VoteTargetType.POST, post.getId(), newType);
        post.setLikeCount(voteRepository.countByTargetTypeAndTargetIdAndVoteType(VoteTargetType.POST, post.getId(), VoteType.UPVOTE));
        post.setDislikeCount(voteRepository.countByTargetTypeAndTargetIdAndVoteType(VoteTargetType.POST, post.getId(), VoteType.DOWNVOTE));
        postRepository.save(post);
        return new PostLikeResponse(post.getLikeCount(), post.getDislikeCount(), newType == VoteType.UPVOTE, newType == VoteType.DOWNVOTE);
    }
    public void bookmarkPost(UUID id, String authorization, boolean remove) {
        UUID userId = currentUserId(authorization);
        PostEntity post = postRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), userId)) throw new ResponseStatusException(NOT_FOUND);
        var existing = bookmarkRepository.findByUserIdAndPost_Id(userId, id);
        if (remove) { existing.ifPresent(bookmarkRepository::delete); }
        else if (existing.isEmpty()) { BookmarkEntity bookmark = new BookmarkEntity(); bookmark.setUserId(userId); bookmark.setPost(post); bookmarkRepository.save(bookmark); }
        post.setSaveCount(bookmarkRepository.countByPost_Id(id));
        postRepository.save(post);
    }
    public CommentResponse addComment(UUID postId, CommentRequest request, String authorization) {
        UUID userId = currentUserId(authorization);
        PostEntity post = postRepository.findByIdAndDeletedFalse(postId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), userId)) throw new ResponseStatusException(NOT_FOUND);
        CommentEntity comment = new CommentEntity();
        comment.setPost(post);
        comment.setAuthorId(userId);
        comment.setText(request.text());
        if (request.parentId() != null) comment.setParentComment(commentRepository.findByIdAndDeletedFalse(request.parentId()).orElseThrow(() -> new ResponseStatusException(NOT_FOUND)));
        comment = commentRepository.save(comment);
        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);
        return toCommentResponse(comment, userId, authorization, buildCommentTree(post.getId(), userId, authorization));
    }
    public List<CommentResponse> getComments(UUID postId, String authorization) {
        UUID userId = optionalUserId(authorization);
        PostEntity post = postRepository.findByIdAndDeletedFalse(postId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), userId)) throw new ResponseStatusException(NOT_FOUND);
        return buildCommentTree(postId, userId, authorization);
    }
    public void deleteComment(UUID id, String authorization) {
        UUID userId = currentUserId(authorization);
        CommentEntity comment = commentRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (!Objects.equals(comment.getAuthorId(), userId)) throw new ResponseStatusException(FORBIDDEN);
        comment.setDeleted(true); comment.setDeletedAt(OffsetDateTime.now()); comment.setText("[deleted]"); commentRepository.save(comment);
    }
    public CommentLikeResponse likeComment(UUID id, String authorization) {
        UUID userId = currentUserId(authorization);
        CommentEntity comment = commentRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        applyVote(userId, VoteTargetType.COMMENT, id, VoteType.UPVOTE);
        comment.setLikeCount(voteRepository.countByTargetTypeAndTargetIdAndVoteType(VoteTargetType.COMMENT, id, VoteType.UPVOTE));
        commentRepository.save(comment);
        return new CommentLikeResponse(comment.getLikeCount(), true);
    }
    public List<TagResponse> trendingTags() {
        return tagRepository.findTop10ByOrderByUsageCountDesc().stream().map(t -> new TagResponse(t.getId(), t.getName(), t.getUsageCount())).toList();
    }
    private void applyPostRequest(PostEntity post, PostRequest request) {
        post.setTitle(request.title());
        post.setContent(request.content());
        post.setExcerpt(request.excerpt() != null ? request.excerpt() : summarizeLocally(request.content()));
        post.setCoverImageUrl(request.coverImageUrl());
        post.setSourceUrls(request.sourceUrl());
        post.setStatus("DRAFT".equalsIgnoreCase(request.status()) ? PostStatus.DRAFT : PostStatus.PUBLISHED);
        Set<TagEntity> tags = new LinkedHashSet<>();
        if (request.tags() != null) for (String name : request.tags()) tags.add(tagRepository.findByNameIgnoreCase(name).orElseGet(() -> { TagEntity t = new TagEntity(); t.setName(name); return tagRepository.save(t); }));
        post.setTags(tags);
        tags.forEach(t -> t.setUsageCount(t.getUsageCount() + 1));
        tagRepository.saveAll(tags);
    }
    private String generateSummary(String authorization, PostEntity post) { try { return String.join("\n", clients.summarize(authorization, post.getId() == null ? UUID.randomUUID() : post.getId(), post.getTitle(), post.getContent()).summary()); } catch (Exception e) { return summarizeLocally(post.getContent()); } }
    private String summarizeLocally(String content) { return content.length() <= 240 ? content : content.substring(0, 240); }
    private UUID currentUserId(String authorization) { return requireCurrentUser(authorization).id(); }
    private UUID optionalUserId(String authorization) { try { return requireCurrentUser(authorization).id(); } catch (Exception e) { return null; } }
    private UserProfileDto requireCurrentUser(String authorization) { if (authorization == null || authorization.isBlank()) throw new ResponseStatusException(UNAUTHORIZED); return clients.getCurrentUser(authorization); }
    private PostEntity mustOwnEditablePost(UUID id, UUID userId) { PostEntity post = postRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND)); if (!Objects.equals(post.getAuthorId(), userId)) throw new ResponseStatusException(FORBIDDEN); return post; }
    private void applyVote(UUID userId, VoteTargetType targetType, UUID targetId, VoteType newType) { var existing = voteRepository.findByUserIdAndTargetTypeAndTargetId(userId, targetType, targetId); if (newType == null) { existing.ifPresent(voteRepository::delete); return; } if (existing.isPresent()) { existing.get().setVoteType(newType); voteRepository.save(existing.get()); } else { VoteEntity vote = new VoteEntity(); vote.setUserId(userId); vote.setTargetType(targetType); vote.setTargetId(targetId); vote.setVoteType(newType); voteRepository.save(vote); } }
    private PostPage mapPage(org.springframework.data.domain.Page<PostEntity> page, UUID currentUser, String authorization) { return new PostPage(page.map(p -> toPostResponse(p, currentUser, authorization)).toList(), page.getNumber(), page.getSize(), page.getTotalPages(), page.getTotalElements()); }
    private PostResponse toPostResponse(PostEntity post, UUID currentUser, String authorization) { return new PostResponse(post.getId(), authorSummary(post.getAuthorId(), authorization), post.getStatus().name(), post.getTitle(), post.getExcerpt(), post.getContent(), post.getCoverImageUrl(), post.getTags().stream().map(t -> new TagDto(t.getId(), t.getName())).toList(), post.getSourceUrls(), readTime(post.getContent()), post.getLikeCount(), post.getDislikeCount(), post.getCommentCount(), post.getViewCount(), post.getSaveCount(), currentUser != null && voteRepository.findByUserIdAndTargetTypeAndTargetId(currentUser, VoteTargetType.POST, post.getId()).map(v -> v.getVoteType() == VoteType.UPVOTE).orElse(false), currentUser != null && voteRepository.findByUserIdAndTargetTypeAndTargetId(currentUser, VoteTargetType.POST, post.getId()).map(v -> v.getVoteType() == VoteType.DOWNVOTE).orElse(false), currentUser != null && bookmarkRepository.existsByUserIdAndPost_Id(currentUser, post.getId()), post.getCreatedAt(), post.getUpdatedAt(), post.getContentSummary()); }
    private PostCard toCard(PostEntity post, UUID currentUser, String authorization) { return new PostCard(post.getId(), authorSummary(post.getAuthorId(), authorization), post.getTitle(), post.getExcerpt(), post.getCoverImageUrl(), post.getTags().stream().map(t -> new TagDto(t.getId(), t.getName())).toList(), readTime(post.getContent()), post.getLikeCount(), post.getCommentCount(), post.getViewCount(), currentUser != null && voteRepository.findByUserIdAndTargetTypeAndTargetId(currentUser, VoteTargetType.POST, post.getId()).map(v -> v.getVoteType() == VoteType.UPVOTE).orElse(false), post.getCreatedAt()); }
    private AuthorSummary authorSummary(UUID userId, String authorization) { UserProfileDto u = null; try { u = clients.getUserById(userId); } catch (Exception ignored) {} return new AuthorSummary(userId, u != null ? u.username() : "unknown", u != null ? u.displayName() : "Unknown", u != null ? u.avatarUrl() : null, u != null ? u.role() : null, u != null ? u.organisation() : null); }
    private int readTime(String content) { return Math.max(1, (content == null ? 0 : content.split("\\s+").length) / 200 + 1); }
    private List<CommentResponse> buildCommentTree(UUID postId, UUID currentUser, String authorization) { Map<UUID, List<CommentEntity>> children = commentRepository.findByPost_IdAndDeletedFalseOrderByCreatedAtAsc(postId).stream().collect(Collectors.groupingBy(c -> c.getParentComment() == null ? null : c.getParentComment().getId(), LinkedHashMap::new, Collectors.toList())); return children.getOrDefault(null, List.of()).stream().map(c -> toCommentNode(c, children, currentUser, authorization)).toList(); }
    private CommentResponse toCommentNode(CommentEntity comment, Map<UUID, List<CommentEntity>> children, UUID currentUser, String authorization) { return new CommentResponse(comment.getId(), authorSummary(comment.getAuthorId(), authorization), comment.getText(), comment.getLikeCount(), currentUser != null && voteRepository.findByUserIdAndTargetTypeAndTargetId(currentUser, VoteTargetType.COMMENT, comment.getId()).isPresent(), comment.getCreatedAt(), children.getOrDefault(comment.getId(), List.of()).stream().map(c -> toCommentNode(c, children, currentUser, authorization)).toList()); }
    private CommentResponse toCommentResponse(CommentEntity comment, UUID currentUser, String authorization, List<CommentResponse> replies) { return new CommentResponse(comment.getId(), authorSummary(comment.getAuthorId(), authorization), comment.getText(), comment.getLikeCount(), currentUser != null && voteRepository.findByUserIdAndTargetTypeAndTargetId(currentUser, VoteTargetType.COMMENT, comment.getId()).isPresent(), comment.getCreatedAt(), replies); }
}
