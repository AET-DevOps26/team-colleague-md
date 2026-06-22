package com.verita.recommendationservice.service.feed;

import com.verita.model.FeedPage;
import com.verita.recommendationservice.client.ContentClient;
import com.verita.recommendationservice.client.dto.PostRankDto;
import com.verita.recommendationservice.entity.TopicSubscription;
import com.verita.recommendationservice.entity.UserSubscription;
import com.verita.recommendationservice.repository.InteractionRepository;
import com.verita.recommendationservice.repository.TopicSubscriptionRepository;
import com.verita.recommendationservice.repository.UserSubscriptionRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Serves the trending and personal feeds (ADR-0003). Both return an ordered {@code postIds} list
 * plus an opaque cursor; clients fetch card data (and {@code isLikedByMe}) from content-service.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class FeedService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int PERSONAL_PER_TOPIC_FETCH = 100;
    private static final int MAX_FOLLOWED_USERS_FETCHED = 25;
    private static final int PERSONAL_PER_USER_FETCH = 20;

    private final TrendingRanker trendingRanker;
    private final FeedScoring scoring;
    private final ContentClient contentClient;
    private final TopicSubscriptionRepository topicSubscriptionRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final InteractionRepository interactionRepository;
    private final TopicNameResolver topicNameResolver;

    @Value("${recommendation.trending.candidate-pool-size:500}")
    private int candidatePoolSize;

    /**
     * Trending is global and shared: the ranked snapshot is computed/cached by {@link TrendingRanker}
     * (per topic) and this only slices the requested page from it.
     */
    public FeedPage getTrendingFeed(String topic, String cursor, Integer size) {
        List<ScoredPost> ranked = trendingRanker.rankedTrending(topic);
        return FeedCursor.paginate(ranked, cursor, pageSize(size));
    }

    /**
     * Personal feed: posts from the user's subscribed topics and followed users (#163), seen-filtered
     * against their interaction history, ranked by the same engagement+recency score. Scoped to the
     * user and never cached. Users with no subscriptions and no follows fall back to trending (cold-start).
     */
    public FeedPage getPersonalFeed(UUID userId, String cursor, Integer size) {
        List<TopicSubscription> subscriptions = topicSubscriptionRepository.findByUserId(userId);
        List<UserSubscription> follows = userSubscriptionRepository.findByFollowerId(userId);
        if (subscriptions.isEmpty() && follows.isEmpty()) {
            return getTrendingFeed(null, cursor, size);
        }

        // Union candidates from subscribed topics and followed users, de-duplicated by post id (#163).
        Map<UUID, PostRankDto> candidatesById = new LinkedHashMap<>();

        Map<UUID, String> topicNames = topicNameResolver.resolve(
                subscriptions.stream().map(TopicSubscription::getTopicId).toList());
        for (String topicName : topicNames.values()) {
            for (PostRankDto post : contentClient.getRecentPosts(topicName, 0, PERSONAL_PER_TOPIC_FETCH)) {
                if (post.id() != null) {
                    candidatesById.putIfAbsent(post.id(), post);
                }
            }
        }

        // Posts from followed users (capped to bound the per-user fan-out).
        follows.stream().limit(MAX_FOLLOWED_USERS_FETCHED).forEach(follow -> {
            for (PostRankDto post : contentClient.getUserPosts(follow.getFollowedId(), 0, PERSONAL_PER_USER_FETCH)) {
                if (post.id() != null) {
                    candidatesById.putIfAbsent(post.id(), post);
                }
            }
        });

        Set<UUID> seen = interactionRepository.findDistinctPostIdsByUserId(userId);
        List<PostRankDto> candidates = candidatesById.values().stream()
                .filter(p -> !seen.contains(p.id()))
                .toList();

        List<ScoredPost> ranked = scoring.rank(candidates);
        if (ranked.size() > candidatePoolSize) {
            ranked = ranked.subList(0, candidatePoolSize);
        }
        return FeedCursor.paginate(ranked, cursor, pageSize(size));
    }

    private int pageSize(Integer size) {
        return (size == null || size <= 0) ? DEFAULT_PAGE_SIZE : size;
    }
}
