package com.verita.recommendationservice.service;

import com.verita.model.FeedPage;
import com.verita.recommendationservice.config.CacheConfig;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
public class FeedService {

    /**
     * Trending content is global — keyed only by topic/cursor/size, never by user —
     * so the result is safe to share across callers. Cached with a short TTL
     * (see {@link CacheConfig}) to shield the ranking engine from repeated identical reads.
     */
    @Cacheable(cacheNames = CacheConfig.TRENDING_FEED_CACHE, key = "{#topic, #cursor, #size}")
    public FeedPage getTrendingFeed(String topic, String cursor, Integer size) {
        // TODO: Call Trending Algorithm Service
        return new FeedPage(new ArrayList<>(), null);
    }

    /**
     * The personalized feed is scoped to a single user and must NOT be cached globally;
     * it is served fresh on every request.
     */
    public FeedPage getPersonalFeed(String cursor, Integer size) {
        // TODO: Call Recommendation Engine Service
        return new FeedPage(new ArrayList<>(), null);
    }
}
