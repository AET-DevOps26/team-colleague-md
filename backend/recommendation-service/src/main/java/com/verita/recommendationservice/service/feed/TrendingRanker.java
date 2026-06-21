package com.verita.recommendationservice.service.feed;

import com.verita.recommendationservice.client.ContentClient;
import com.verita.recommendationservice.client.dto.PostRankDto;
import com.verita.recommendationservice.config.CacheConfig;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

/**
 * Builds the globally-shared trending ranking: pulls a recency-bounded candidate pool of posts
 * from content-service and scores them. The whole ranked list is cached per topic (ADR-0003) with
 * a short TTL; {@link FeedService} slices pages from the cached snapshot via cursor, so pagination
 * is stable within a TTL window. Kept a separate bean so the {@code @Cacheable} proxy is honoured
 * (self-invocation from FeedService would bypass it).
 */
@Component
@RequiredArgsConstructor
public class TrendingRanker {

    private static final int FETCH_PAGE_SIZE = 100;

    private final ContentClient contentClient;
    private final FeedScoring scoring;

    @Value("${recommendation.trending.candidate-pool-size:500}")
    private int candidatePoolSize;

    /**
     * The full ranked trending list for a topic ({@code null}/blank = all topics). Cached per topic;
     * cursor/size are deliberately not part of the key — pages are sliced from this snapshot.
     */
    @Cacheable(cacheNames = CacheConfig.TRENDING_FEED_CACHE,
            key = "(#topic == null || #topic.isBlank()) ? 'all' : #topic.toLowerCase()")
    public List<ScoredPost> rankedTrending(String topic) {
        return scoring.rank(fetchCandidatePool(topic));
    }

    private List<PostRankDto> fetchCandidatePool(String topic) {
        List<PostRankDto> pool = new ArrayList<>();
        int page = 0;
        while (pool.size() < candidatePoolSize) {
            List<PostRankDto> batch = contentClient.getRecentPosts(topic, page, FETCH_PAGE_SIZE);
            if (batch.isEmpty()) {
                break;
            }
            pool.addAll(batch);
            if (batch.size() < FETCH_PAGE_SIZE) {
                break; // last page
            }
            page++;
        }
        return pool.size() > candidatePoolSize ? pool.subList(0, candidatePoolSize) : pool;
    }
}
