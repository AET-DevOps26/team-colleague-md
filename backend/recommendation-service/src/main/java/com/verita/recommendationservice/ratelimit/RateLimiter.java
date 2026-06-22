package com.verita.recommendationservice.ratelimit;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;

/**
 * In-process, per-user token-bucket rate limiter. Each user gets a bucket that refills
 * continuously at a fixed rate up to a capacity (burst size). Buckets live in a
 * size- and time-bounded Caffeine cache so idle users are evicted and the store cannot
 * grow without bound.
 *
 * <p>This guards a single instance. Behind multiple replicas the effective limit is
 * {@code capacity × replicas}; move to a shared store (e.g. Redis) if a global limit is required.
 */
@Component
public class RateLimiter {

    private final int capacity;
    private final double refillTokensPerSecond;
    private final Cache<UUID, Bucket> buckets;

    public RateLimiter(
            @Value("${recommendation.rate-limit.interactions.capacity:100}") int capacity,
            @Value("${recommendation.rate-limit.interactions.refill-per-second:20}") double refillTokensPerSecond) {
        this.capacity = capacity;
        this.refillTokensPerSecond = refillTokensPerSecond;
        this.buckets = Caffeine.newBuilder()
                .expireAfterAccess(Duration.ofMinutes(10))
                .maximumSize(100_000)
                .build();
    }

    /**
     * @return {@code true} if a token was available and consumed, {@code false} if the
     *         caller is over their limit and should be throttled.
     */
    public boolean tryAcquire(UUID key) {
        return buckets.get(key, k -> new Bucket(capacity, refillTokensPerSecond)).tryConsume();
    }

    private static final class Bucket {
        private final int capacity;
        private final double refillTokensPerSecond;
        private double tokens;
        private long lastRefillNanos;

        Bucket(int capacity, double refillTokensPerSecond) {
            this.capacity = capacity;
            this.refillTokensPerSecond = refillTokensPerSecond;
            this.tokens = capacity;
            this.lastRefillNanos = System.nanoTime();
        }

        synchronized boolean tryConsume() {
            refill();
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }

        private void refill() {
            long now = System.nanoTime();
            double elapsedSeconds = (now - lastRefillNanos) / 1_000_000_000.0;
            if (elapsedSeconds > 0) {
                tokens = Math.min(capacity, tokens + elapsedSeconds * refillTokensPerSecond);
                lastRefillNanos = now;
            }
        }
    }
}
