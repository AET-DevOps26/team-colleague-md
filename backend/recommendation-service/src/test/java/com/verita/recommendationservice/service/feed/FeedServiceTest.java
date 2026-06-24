package com.verita.recommendationservice.service.feed;

import com.verita.model.FeedPage;
import com.verita.recommendationservice.client.ContentClient;
import com.verita.recommendationservice.client.dto.PostRankDto;
import com.verita.recommendationservice.entity.TopicSubscription;
import com.verita.recommendationservice.entity.UserSubscription;
import com.verita.recommendationservice.repository.InteractionRepository;
import com.verita.recommendationservice.repository.TopicSubscriptionRepository;
import com.verita.recommendationservice.repository.UserSubscriptionRepository;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeedServiceTest {

    @Mock private TrendingRanker trendingRanker;
    @Mock private ContentClient contentClient;
    @Mock private TopicSubscriptionRepository topicSubscriptionRepository;
    @Mock private UserSubscriptionRepository userSubscriptionRepository;
    @Mock private InteractionRepository interactionRepository;
    @Mock private TopicNameResolver topicNameResolver;

    private FeedService feedService;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        FeedScoring scoring = new FeedScoring(1.0, 2.0, 0.15, 1.5);
        feedService = new FeedService(trendingRanker, scoring, contentClient,
                topicSubscriptionRepository, userSubscriptionRepository, interactionRepository, topicNameResolver);
        ReflectionTestUtils.setField(feedService, "candidatePoolSize", 500);
        ReflectionTestUtils.setField(feedService, "affinityWeight", 0.5);
        ReflectionTestUtils.setField(feedService, "affinityCap", 5);
        // Default: no interactions seen. Individual tests override.
        lenient().when(interactionRepository.findDistinctPostIdsByUserId(userId)).thenReturn(Set.of());
    }

    private static PostRankDto post(UUID id) {
        return new PostRankDto(id, 5, 1, 10, OffsetDateTime.now());
    }

    private TopicSubscription topicSub(UUID topicId) {
        TopicSubscription s = new TopicSubscription();
        s.setUserId(userId);
        s.setTopicId(topicId);
        return s;
    }

    private UserSubscription follow(UUID followedId) {
        UserSubscription s = new UserSubscription();
        s.setFollowerId(userId);
        s.setFollowedId(followedId);
        return s;
    }

    @Test
    void personalFeed_noSubscriptionsNoFollows_fallsBackToTrending() {
        when(topicSubscriptionRepository.findByUserId(userId)).thenReturn(List.of());
        when(userSubscriptionRepository.findByFollowerId(userId)).thenReturn(List.of());
        UUID trendingPost = UUID.randomUUID();
        when(trendingRanker.rankedTrending(null)).thenReturn(List.of(new ScoredPost(trendingPost, 1.0)));

        FeedPage page = feedService.getPersonalFeed(userId, null, 20);

        assertEquals(List.of(trendingPost), page.getPostIds());
        verify(trendingRanker).rankedTrending(null);
    }

    @Test
    void personalFeed_returnsRankedSubscribedTopicPosts() {
        UUID topicId = UUID.randomUUID();
        when(topicSubscriptionRepository.findByUserId(userId)).thenReturn(List.of(topicSub(topicId)));
        when(userSubscriptionRepository.findByFollowerId(userId)).thenReturn(List.of());
        when(topicNameResolver.resolve(List.of(topicId))).thenReturn(Map.of(topicId, "ai"));
        UUID p1 = UUID.randomUUID();
        when(contentClient.getRecentPosts(eq("ai"), anyInt(), anyInt())).thenReturn(List.of(post(p1)));

        FeedPage page = feedService.getPersonalFeed(userId, null, 20);

        assertEquals(List.of(p1), page.getPostIds());
    }

    @Test
    void personalFeed_includesFollowedUsersPosts() {
        UUID followedId = UUID.randomUUID();
        when(topicSubscriptionRepository.findByUserId(userId)).thenReturn(List.of());
        when(userSubscriptionRepository.findByFollowerId(userId)).thenReturn(List.of(follow(followedId)));
        UUID p2 = UUID.randomUUID();
        when(contentClient.getUserPosts(eq(followedId), anyInt(), anyInt())).thenReturn(List.of(post(p2)));

        FeedPage page = feedService.getPersonalFeed(userId, null, 20);

        assertEquals(List.of(p2), page.getPostIds());
    }

    @Test
    void personalFeed_excludesSeenPosts() {
        UUID topicId = UUID.randomUUID();
        when(topicSubscriptionRepository.findByUserId(userId)).thenReturn(List.of(topicSub(topicId)));
        when(userSubscriptionRepository.findByFollowerId(userId)).thenReturn(List.of());
        when(topicNameResolver.resolve(List.of(topicId))).thenReturn(Map.of(topicId, "ai"));
        UUID seenPost = UUID.randomUUID();
        UUID freshPost = UUID.randomUUID();
        when(contentClient.getRecentPosts(eq("ai"), anyInt(), anyInt()))
                .thenReturn(List.of(post(seenPost), post(freshPost)));
        when(interactionRepository.findDistinctPostIdsByUserId(userId)).thenReturn(Set.of(seenPost));

        FeedPage page = feedService.getPersonalFeed(userId, null, 20);

        assertTrue(page.getPostIds().contains(freshPost));
        assertFalse(page.getPostIds().contains(seenPost));
    }

    @Test
    void personalFeed_boostsTopicTheUserInteractsWith() {
        // Two equally-scored posts in different topics; the user has interacted with topic "a"'s
        // candidates, so its remaining post should rank above topic "b"'s (#164 affinity).
        UUID topicA = UUID.randomUUID();
        UUID topicB = UUID.randomUUID();
        when(topicSubscriptionRepository.findByUserId(userId))
                .thenReturn(List.of(topicSub(topicA), topicSub(topicB)));
        when(userSubscriptionRepository.findByFollowerId(userId)).thenReturn(List.of());
        Map<UUID, String> names = new LinkedHashMap<>();
        names.put(topicA, "a");
        names.put(topicB, "b");
        when(topicNameResolver.resolve(any())).thenReturn(names);

        UUID seenInA = UUID.randomUUID();
        UUID aPost = UUID.randomUUID();
        UUID bPost = UUID.randomUUID();
        when(contentClient.getRecentPosts(eq("a"), anyInt(), anyInt()))
                .thenReturn(List.of(post(seenInA), post(aPost)));
        when(contentClient.getRecentPosts(eq("b"), anyInt(), anyInt()))
                .thenReturn(List.of(post(bPost)));
        when(interactionRepository.findDistinctPostIdsByUserId(userId)).thenReturn(Set.of(seenInA));

        FeedPage page = feedService.getPersonalFeed(userId, null, 20);

        assertEquals(List.of(aPost, bPost), page.getPostIds());
    }

    @Test
    void trendingFeed_paginatesRankedSnapshot() {
        UUID p1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();
        when(trendingRanker.rankedTrending("ai"))
                .thenReturn(List.of(new ScoredPost(p1, 9.0), new ScoredPost(p2, 8.0)));

        FeedPage page = feedService.getTrendingFeed("ai", null, 20);

        assertEquals(List.of(p1, p2), page.getPostIds());
    }
}
