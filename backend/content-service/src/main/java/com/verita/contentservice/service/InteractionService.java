package com.verita.contentservice.service;

import com.verita.contentservice.entity.BookmarkEntity;
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
import com.verita.model.CommentLikeResponse;
import com.verita.model.LikeRequest;
import com.verita.model.PostLikeResponse;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@Transactional
@RequiredArgsConstructor
public class InteractionService {
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final VoteRepository voteRepository;
    private final BookmarkRepository bookmarkRepository;
    private final SecurityUtils securityUtils;

    public PostLikeResponse likePost(UUID id, LikeRequest.TypeEnum type) {
        UUID userId = securityUtils.getCurrentUserId();
        PostEntity post = postRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), userId))
            throw new ResponseStatusException(NOT_FOUND);
        VoteType newType = switch (type) {
            case LIKE -> VoteType.UPVOTE;
            case DISLIKE -> VoteType.DOWNVOTE;
            case NONE -> null;
        };
        applyVote(userId, VoteTargetType.POST, post.getId(), newType);
        postRepository.refreshVoteCounts(post.getId());
        PostEntity updated = postRepository.findByIdAndDeletedFalse(post.getId()).orElseThrow();
        return new PostLikeResponse()
                .likeCount((int) updated.getLikeCount())
                .dislikeCount((int) updated.getDislikeCount())
                .isLikedByMe(newType == VoteType.UPVOTE)
                .isDislikedByMe(newType == VoteType.DOWNVOTE);
    }

    public CommentLikeResponse likeComment(UUID id) {
        UUID userId = securityUtils.getCurrentUserId();
        commentRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        applyVote(userId, VoteTargetType.COMMENT, id, VoteType.UPVOTE);
        commentRepository.refreshLikeCount(id);
        var updated = commentRepository.findByIdAndDeletedFalse(id).orElseThrow();
        return new CommentLikeResponse().likeCount((int) updated.getLikeCount()).isLikedByMe(true);
    }

    public void bookmarkPost(UUID id) {
        UUID userId = securityUtils.getCurrentUserId();
        PostEntity post = postRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        if (post.getStatus() == PostStatus.DRAFT && !Objects.equals(post.getAuthorId(), userId))
            throw new ResponseStatusException(NOT_FOUND);
        if (bookmarkRepository.findByUserIdAndPost_Id(userId, id).isEmpty()) {
            BookmarkEntity bookmark = new BookmarkEntity();
            bookmark.setUserId(userId);
            bookmark.setPost(post);
            bookmarkRepository.save(bookmark);
        }
        postRepository.refreshSaveCount(id);
    }

    public void unbookmarkPost(UUID id) {
        UUID userId = securityUtils.getCurrentUserId();
        postRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        bookmarkRepository.findByUserIdAndPost_Id(userId, id).ifPresent(bookmarkRepository::delete);
        postRepository.refreshSaveCount(id);
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
}
