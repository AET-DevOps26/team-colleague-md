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
import com.verita.model.CommentLikeRequest;
import com.verita.model.CommentLikeResponse;
import com.verita.model.LikeRequest;
import com.verita.model.PostLikeResponse;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
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
    private final ApplicationEventPublisher eventPublisher;

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
        long likesBefore = post.getLikeCount();
        applyVote(userId, VoteTargetType.POST, post.getId(), newType);
        postRepository.refreshVoteCounts(post.getId());
        PostEntity updated = postRepository.findByIdAndDeletedFalse(post.getId()).orElseThrow();
        // The change in the post's like tally is exactly the change in likes the author has received
        // (issue #178). Forwarded to user-service after commit, off this transaction; drift is tolerated
        // (ADR-0007).
        int likeReceivedDelta = (int) (updated.getLikeCount() - likesBefore);
        if (likeReceivedDelta != 0) {
            eventPublisher.publishEvent(new UserStatsDeltaEvent(post.getAuthorId(), 0, likeReceivedDelta));
        }
        return new PostLikeResponse()
                .likeCount((int) updated.getLikeCount())
                .dislikeCount((int) updated.getDislikeCount())
                .isLikedByMe(newType == VoteType.UPVOTE)
                .isDislikedByMe(newType == VoteType.DOWNVOTE);
    }

    public CommentLikeResponse likeComment(UUID id, CommentLikeRequest.TypeEnum type) {
        UUID userId = securityUtils.getCurrentUserId();
        commentRepository.findByIdAndDeletedFalse(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        VoteType newType = type == CommentLikeRequest.TypeEnum.LIKE ? VoteType.UPVOTE : null;
        applyVote(userId, VoteTargetType.COMMENT, id, newType);
        commentRepository.refreshLikeCount(id);
        var updated = commentRepository.findByIdAndDeletedFalse(id).orElseThrow();
        return new CommentLikeResponse()
                .likeCount((int) updated.getLikeCount())
                .isLikedByMe(newType == VoteType.UPVOTE);
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
