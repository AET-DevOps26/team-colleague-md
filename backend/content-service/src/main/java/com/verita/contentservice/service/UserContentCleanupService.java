package com.verita.contentservice.service;

import com.verita.contentservice.domain.BookmarkEntity;
import com.verita.contentservice.domain.CommentEntity;
import com.verita.contentservice.domain.PostEntity;
import com.verita.contentservice.domain.PostStatus;
import com.verita.contentservice.domain.VoteEntity;
import com.verita.contentservice.domain.VoteTargetType;
import com.verita.contentservice.repository.BookmarkRepository;
import com.verita.contentservice.repository.CommentRepository;
import com.verita.contentservice.repository.PostRepository;
import com.verita.contentservice.repository.TopicRepository;
import com.verita.contentservice.repository.VoteRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserContentCleanupService {
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final BookmarkRepository bookmarkRepository;
    private final VoteRepository voteRepository;
    private final TopicRepository topicRepository;

    public UserContentCleanupService(PostRepository postRepository,
                                     CommentRepository commentRepository,
                                     BookmarkRepository bookmarkRepository,
                                     VoteRepository voteRepository,
                                     TopicRepository topicRepository) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.voteRepository = voteRepository;
        this.topicRepository = topicRepository;
    }

    public void deleteUserData(UUID userId) {
        OffsetDateTime deletedAt = OffsetDateTime.now();
        softDeleteAuthoredPosts(userId, deletedAt);
        softDeleteAuthoredComments(userId, deletedAt);
        deleteUserBookmarks(userId);
        deleteUserVotes(userId);
    }

    private void softDeleteAuthoredPosts(UUID userId, OffsetDateTime deletedAt) {
        List<PostEntity> posts = postRepository.findByAuthorIdAndDeletedFalse(userId);
        for (PostEntity post : posts) {
            post.setDeleted(true);
            post.setDeletedAt(deletedAt);
            if (post.getStatus() == PostStatus.PUBLISHED && post.getTopics() != null) {
                post.getTopics().forEach(topic -> topicRepository.decrementTotalPostCount(topic.getId()));
            }
        }
        postRepository.saveAll(posts);
    }

    private void softDeleteAuthoredComments(UUID userId, OffsetDateTime deletedAt) {
        List<CommentEntity> comments = commentRepository.findByAuthorIdAndDeletedFalse(userId);
        for (CommentEntity comment : comments) {
            comment.setDeleted(true);
            comment.setDeletedAt(deletedAt);
            comment.setText("[deleted]");
            postRepository.decrementCommentCount(comment.getPost().getId());
        }
        commentRepository.saveAll(comments);
    }

    private void deleteUserBookmarks(UUID userId) {
        Set<UUID> affectedPostIds = bookmarkRepository.findByUserId(userId).stream()
                .map(BookmarkEntity::getPost)
                .map(PostEntity::getId)
                .collect(Collectors.toSet());

        bookmarkRepository.deleteByUserId(userId);
        affectedPostIds.forEach(postRepository::refreshSaveCount);
    }

    private void deleteUserVotes(UUID userId) {
        List<VoteEntity> votes = voteRepository.findByUserId(userId);
        Set<UUID> affectedPostIds = votes.stream()
                .filter(vote -> vote.getTargetType() == VoteTargetType.POST)
                .map(VoteEntity::getTargetId)
                .collect(Collectors.toSet());
        Set<UUID> affectedCommentIds = votes.stream()
                .filter(vote -> vote.getTargetType() == VoteTargetType.COMMENT)
                .map(VoteEntity::getTargetId)
                .collect(Collectors.toSet());

        voteRepository.deleteByUserId(userId);
        affectedPostIds.forEach(postRepository::refreshVoteCounts);
        affectedCommentIds.forEach(commentRepository::refreshLikeCount);
    }
}
