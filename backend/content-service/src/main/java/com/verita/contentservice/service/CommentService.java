package com.verita.contentservice.service;

import com.verita.contentservice.client.UserClient;
import com.verita.contentservice.dto.UserProfileDto;
import com.verita.contentservice.entity.CommentEntity;
import com.verita.contentservice.entity.PostEntity;
import com.verita.contentservice.entity.PostStatus;
import com.verita.contentservice.entity.VoteEntity;
import com.verita.contentservice.entity.VoteTargetType;
import com.verita.contentservice.repository.CommentRepository;
import com.verita.contentservice.repository.PostRepository;
import com.verita.contentservice.repository.VoteRepository;
import com.verita.contentservice.security.SecurityUtils;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
public class CommentService {
    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final VoteRepository voteRepository;
    private final UserClient userClient;
    private final SecurityUtils securityUtils;

    public CommentResponse addComment(UUID postId, @Valid CommentRequest request) {
        UUID userId = securityUtils.getCurrentUserId();
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

    public List<CommentResponse> getComments(UUID postId) {
        UUID userId = securityUtils.getCurrentUserIdOptional().orElse(null);
        PostEntity post = postRepository.findByIdAndDeletedFalse(postId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), userId))
            throw new ResponseStatusException(NOT_FOUND);
        return buildCommentTree(postId, userId);
    }

    public void deleteComment(UUID id) {
        UUID userId = securityUtils.getCurrentUserId();
        CommentEntity comment = commentRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        // The comment author or the author of the post it belongs to may delete it (Epic 4 / P1).
        boolean isCommentAuthor = Objects.equals(comment.getAuthorId(), userId);
        boolean isPostAuthor = Objects.equals(comment.getPost().getAuthorId(), userId);
        if (!isCommentAuthor && !isPostAuthor) throw new ResponseStatusException(FORBIDDEN);
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
        try { u = userClient.getUserById(userId); } catch (Exception e) {
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
}
