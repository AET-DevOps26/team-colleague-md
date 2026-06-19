package com.verita.recommendationservice.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
@EnableCaching
public class CacheConfig {

    /** Cache name for the globally-shared trending feed. */
    public static final String TRENDING_FEED_CACHE = "trendingFeed";

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(TRENDING_FEED_CACHE);
        // Trending ranking is expensive and changes slowly — a short TTL keeps it fresh
        // while absorbing bursts of identical anonymous reads.
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofSeconds(60))
                .maximumSize(1_000));
        return cacheManager;
    }
}
