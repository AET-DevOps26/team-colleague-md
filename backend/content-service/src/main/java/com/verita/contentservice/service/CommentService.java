package com.verita.contentservice.service;

import com.verita.contentservice.domain.CommentEntity;
import com.verita.contentservice.domain.PostEntity;
import com.verita.contentservice.domain.PostStatus;
import com.verita.contentservice.domain.VoteEntity;
import com.verita.contentservice.domain.VoteTargetType;
import com.verita.contentservice.dto.UserProfileDto;
import com.verita.contentservice.repository.CommentRepository;
import com.verita.contentservice.repository.PostRepository;
import com.verita.contentservice.repository.VoteRepository;
import com.verita.contentservice.support.Clients;
import com.verita.model.AuthorSummary;
import com.verita.model.CommentRequest;
import com.verita.model.CommentResponse;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
@Validated
@Transactional
public class CommentService {
    private static final Logger log = LoggerFactory.getLogger(CommentService.class);
    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final VoteRepository voteRepository;
    private final Clients clients;

    public CommentService(CommentRepository commentRepository, PostRepository postRepository,
                          VoteRepository voteRepository, Clients clients) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.voteRepository = voteRepository;
        this.clients = clients;
    }

    public CommentResponse addComment(UUID postId, @Valid CommentRequest request, String authorization) {
        UUID userId = currentUserId(authorization);
        PostEntity post = postRepository.findByIdAndDeletedFalse(postId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), userId))
            throw new ResponseStatusException(NOT_FOUND);
        CommentEntity comment = new CommentEntity();
        comment.setPost(post);
        comment.setAuthorId(userId);
        comment.setText(request.getText());
        if (request.getParentId() != null && request.getParentId().isPresent()) {
            CommentEntity parent = commentRepository.findByIdAndDeletedFalse(request.getParentId().get())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
            if (!Objects.equals(parent.getPost().getId(), postId))
                throw new ResponseStatusException(BAD_REQUEST, "Parent comment does not belong to this post");
            comment.setParentComment(parent);
        }
        comment = commentRepository.save(comment);
        postRepository.incrementCommentCount(post.getId());
        return toCommentResponse(comment, userId, List.of());
    }

    public List<CommentResponse> getComments(UUID postId, String authorization) {
        UUID userId = optionalUserId(authorization);
        PostEntity post = postRepository.findByIdAndDeletedFalse(postId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), userId))
            throw new ResponseStatusException(NOT_FOUND);
        return buildCommentTree(postId, userId);
    }

    public void deleteComment(UUID id, String authorization) {
        UUID userId = currentUserId(authorization);
        CommentEntity comment = commentRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (!Objects.equals(comment.getAuthorId(), userId)) throw new ResponseStatusException(FORBIDDEN);
        comment.setDeleted(true);
        comment.setDeletedAt(OffsetDateTime.now());
        comment.setText("[deleted]");
        commentRepository.save(comment);
        postRepository.decrementCommentCount(comment.getPost().getId());
    }

    private CommentResponse toCommentResponse(CommentEntity comment, UUID currentUser, List<CommentResponse> replies) {
        return new CommentResponse()
                .id(comment.getId())
                .author(authorSummary(comment.getAuthorId()))
                .text(comment.getText())
                .likeCount((int) comment.getLikeCount())
                .isLikedByMe(currentUser != null && voteRepository
                        .findByUserIdAndTargetTypeAndTargetId(currentUser, VoteTargetType.COMMENT, comment.getId())
                        .isPresent())
                .createdAt(comment.getCreatedAt())
                .replies(replies);
    }

    private CommentResponse toCommentNode(CommentEntity comment, Map<UUID, List<CommentEntity>> children,
                                          Set<UUID> likedCommentIds) {
        return new CommentResponse()
                .id(comment.getId())
                .author(authorSummary(comment.getAuthorId()))
                .text(comment.getText())
                .likeCount((int) comment.getLikeCount())
                .isLikedByMe(likedCommentIds.contains(comment.getId()))
                .createdAt(comment.getCreatedAt())
                .replies(children.getOrDefault(comment.getId(), List.of()).stream()
                        .map(c -> toCommentNode(c, children, likedCommentIds)).toList());
    }

    private List<CommentResponse> buildCommentTree(UUID postId, UUID currentUser) {
        Map<UUID, List<CommentEntity>> children = new LinkedHashMap<>();
        List<CommentEntity> allComments = commentRepository.findByPost_IdOrderByCreatedAtAsc(postId);
        for (CommentEntity comment : allComments) {
            UUID parentId = comment.getParentComment() == null ? null : comment.getParentComment().getId();
            children.computeIfAbsent(parentId, k -> new ArrayList<>()).add(comment);
        }
        Set<UUID> likedCommentIds = Set.of();
        if (currentUser != null && !allComments.isEmpty()) {
            List<UUID> commentIds = allComments.stream().map(CommentEntity::getId).toList();
            likedCommentIds = voteRepository
                    .findByUserIdAndTargetTypeAndTargetIdIn(currentUser, VoteTargetType.COMMENT, commentIds)
                    .stream().map(VoteEntity::getTargetId).collect(Collectors.toSet());
        }
        final Set<UUID> finalLikedIds = likedCommentIds;
        return children.getOrDefault(null, List.of()).stream()
                .map(c -> toCommentNode(c, children, finalLikedIds)).toList();
    }

    private AuthorSummary authorSummary(UUID userId) {
        UserProfileDto u = null;
        try { u = clients.getUserById(userId); } catch (Exception e) {
            log.warn("Failed to fetch user {} for author summary: {}", userId, e.getMessage());
        }
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

    private UUID currentUserId(String authorization) {
        if (authorization == null || authorization.isBlank()) throw new ResponseStatusException(UNAUTHORIZED);
        return clients.getCurrentUser(authorization).id();
    }

    private UUID optionalUserId(String authorization) {
        try {
            if (authorization == null || authorization.isBlank()) return null;
            return clients.getCurrentUser(authorization).id();
        } catch (Exception e) {
            return null;
        }
    }
}
