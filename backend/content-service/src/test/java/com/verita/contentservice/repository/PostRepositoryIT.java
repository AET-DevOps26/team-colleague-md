package com.verita.contentservice.repository;

import com.verita.contentservice.TestcontainersConfiguration;
import com.verita.contentservice.entity.BookmarkEntity;
import com.verita.contentservice.entity.CommentEntity;
import com.verita.contentservice.entity.PostEntity;
import com.verita.contentservice.entity.PostStatus;
import com.verita.contentservice.entity.PostType;
import com.verita.contentservice.entity.VoteEntity;
import com.verita.contentservice.entity.VoteTargetType;
import com.verita.contentservice.entity.VoteType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Exercises the native and derived-query repository methods against a real PostgreSQL
 * (full-text search, the GREATEST-clamped counters, vote/bookmark sub-selects) — behaviour
 * that mocks cannot verify. Runs only when Docker is available; skipped otherwise.
 * Each test runs in a transaction that is rolled back afterwards.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
@Transactional
class PostRepositoryIT {

    @Autowired private PostRepository postRepository;
    @Autowired private VoteRepository voteRepository;
    @Autowired private BookmarkRepository bookmarkRepository;
    @Autowired private CommentRepository commentRepository;

    @BeforeEach
    void cleanDatabase() {
        commentRepository.deleteAll();
        bookmarkRepository.deleteAll();
        voteRepository.deleteAll();
        postRepository.deleteAll();
    }

    private PostEntity newPost(String title, String content, PostStatus status, boolean deleted) {
        PostEntity p = new PostEntity();
        p.setAuthorId(UUID.randomUUID());
        p.setTitle(title);
        p.setContent(content);
        p.setStatus(status);
        p.setDeleted(deleted);
        return postRepository.saveAndFlush(p);
    }

    private void vote(UUID postId, UUID userId, VoteType type) {
        VoteEntity v = new VoteEntity();
        v.setUserId(userId);
        v.setTargetType(VoteTargetType.POST);
        v.setTargetId(postId);
        v.setVoteType(type);
        voteRepository.saveAndFlush(v);
    }

    private void bookmark(PostEntity post, UUID userId) {
        BookmarkEntity b = new BookmarkEntity();
        b.setUserId(userId);
        b.setPost(post);
        bookmarkRepository.saveAndFlush(b);
    }

    @Test
    void searchPublished_matchesByFullText() {
        newPost("Deploying Kubernetes", "Running containers on kubernetes clusters at scale", PostStatus.PUBLISHED, false);
        newPost("Sourdough basics", "How to bake bread at home", PostStatus.PUBLISHED, false);

        List<PostEntity> hits = postRepository.searchPublished("kubernetes", PageRequest.of(0, 10)).getContent();

        assertEquals(1, hits.size());
        assertTrue(hits.get(0).getTitle().contains("Kubernetes"));
    }

    @Test
    void findByDeletedFalseAndStatus_excludesDraftsAndDeleted() {
        newPost("Published", "visible content", PostStatus.PUBLISHED, false);
        newPost("Draft", "hidden content", PostStatus.DRAFT, false);
        newPost("Removed", "gone content", PostStatus.PUBLISHED, true);

        List<PostEntity> published = postRepository
                .findByDeletedFalseAndStatusAndTypeOrderByCreatedAtDesc(PostStatus.PUBLISHED, PostType.NORMAL, PageRequest.of(0, 10))
                .getContent();

        assertEquals(1, published.size());
        assertEquals("Published", published.get(0).getTitle());
    }

    @Test
    void findBookmarkedPublishedPostsByUserId_returnsOnlyUsersBookmarks() {
        UUID user = UUID.randomUUID();
        PostEntity bookmarked = newPost("Saved", "content", PostStatus.PUBLISHED, false);
        newPost("Other", "content", PostStatus.PUBLISHED, false);
        bookmark(bookmarked, user);

        List<PostEntity> result = postRepository
                .findBookmarkedPublishedPostsByUserId(user, PageRequest.of(0, 10)).getContent();

        assertEquals(1, result.size());
        assertEquals(bookmarked.getId(), result.get(0).getId());
    }

    @Test
    void findLikedPublishedPostsByUserId_returnsOnlyUpvotedPosts() {
        UUID user = UUID.randomUUID();
        PostEntity liked = newPost("Liked", "content", PostStatus.PUBLISHED, false);
        PostEntity disliked = newPost("Disliked", "content", PostStatus.PUBLISHED, false);
        vote(liked.getId(), user, VoteType.UPVOTE);
        vote(disliked.getId(), user, VoteType.DOWNVOTE);

        List<PostEntity> result = postRepository
                .findLikedPublishedPostsByUserId(user, PageRequest.of(0, 10)).getContent();

        assertEquals(1, result.size());
        assertEquals(liked.getId(), result.get(0).getId());
    }

    @Test
    void findBookmarkedPublishedPostsByUserId_ordersByMostRecentBookmark() throws InterruptedException {
        UUID user = UUID.randomUUID();
        // older post, newer post — but bookmark the older one last so it must sort first
        PostEntity older = newPost("Older", "content", PostStatus.PUBLISHED, false);
        Thread.sleep(5);
        PostEntity newer = newPost("Newer", "content", PostStatus.PUBLISHED, false);
        bookmark(newer, user);
        Thread.sleep(5);
        bookmark(older, user);

        List<PostEntity> result = postRepository
                .findBookmarkedPublishedPostsByUserId(user, PageRequest.of(0, 10)).getContent();

        assertEquals(2, result.size());
        assertEquals(older.getId(), result.get(0).getId());
        assertEquals(newer.getId(), result.get(1).getId());
    }

    @Test
    void findLikedPublishedPostsByUserId_ordersByMostRecentLike() throws InterruptedException {
        UUID user = UUID.randomUUID();
        // older post, newer post — but upvote the older one last so it must sort first
        PostEntity older = newPost("Older", "content", PostStatus.PUBLISHED, false);
        Thread.sleep(5);
        PostEntity newer = newPost("Newer", "content", PostStatus.PUBLISHED, false);
        vote(newer.getId(), user, VoteType.UPVOTE);
        Thread.sleep(5);
        vote(older.getId(), user, VoteType.UPVOTE);

        List<PostEntity> result = postRepository
                .findLikedPublishedPostsByUserId(user, PageRequest.of(0, 10)).getContent();

        assertEquals(2, result.size());
        assertEquals(older.getId(), result.get(0).getId());
        assertEquals(newer.getId(), result.get(1).getId());
    }

    @Test
    void refreshVoteCounts_recomputesLikesAndDislikesFromVotes() {
        PostEntity post = newPost("Counted", "content", PostStatus.PUBLISHED, false);
        vote(post.getId(), UUID.randomUUID(), VoteType.UPVOTE);
        vote(post.getId(), UUID.randomUUID(), VoteType.UPVOTE);
        vote(post.getId(), UUID.randomUUID(), VoteType.DOWNVOTE);

        postRepository.refreshVoteCounts(post.getId());

        PostEntity refreshed = postRepository.findById(post.getId()).orElseThrow();
        assertEquals(2, refreshed.getLikeCount());
        assertEquals(1, refreshed.getDislikeCount());
    }

    @Test
    void refreshSaveCount_countsBookmarks() {
        PostEntity post = newPost("Saved", "content", PostStatus.PUBLISHED, false);
        bookmark(post, UUID.randomUUID());
        bookmark(post, UUID.randomUUID());

        postRepository.refreshSaveCount(post.getId());

        assertEquals(2, postRepository.findById(post.getId()).orElseThrow().getSaveCount());
    }

    @Test
    void decrementCommentCount_isFlooredAtZero() {
        PostEntity post = newPost("NoComments", "content", PostStatus.PUBLISHED, false);

        postRepository.decrementCommentCount(post.getId());

        assertEquals(0, postRepository.findById(post.getId()).orElseThrow().getCommentCount());
    }

    @Test
    void incrementCommentCount_andViewCount_increase() {
        PostEntity post = newPost("Counters", "content", PostStatus.PUBLISHED, false);

        postRepository.incrementCommentCount(post.getId());
        postRepository.incrementViewCount(post.getId());

        PostEntity refreshed = postRepository.findById(post.getId()).orElseThrow();
        assertEquals(1, refreshed.getCommentCount());
        assertEquals(1, refreshed.getViewCount());
    }
}
