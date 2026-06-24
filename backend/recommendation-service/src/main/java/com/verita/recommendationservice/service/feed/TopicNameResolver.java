package com.verita.recommendationservice.service.feed;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.verita.recommendationservice.client.ContentClient;
import com.verita.recommendationservice.client.dto.TopicDto;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Resolves topic IDs to names via content-service, with a short-lived id→name Caffeine cache
 * (topic names rarely change). Backs the empty-name fix in {@code getSubscribedTopics} (#158)
 * and the follower-count sync, which keys content by name. Unresolved IDs are simply absent from
 * the returned map — callers fall back to an empty name rather than failing (ADR-0003).
 */
@Component
public class TopicNameResolver {

    private final ContentClient contentClient;
    private final Cache<UUID, String> cache;

    public TopicNameResolver(ContentClient contentClient,
                             @Value("${recommendation.topic-name-cache.ttl-minutes:10}") long ttlMinutes) {
        this.contentClient = contentClient;
        this.cache = Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofMinutes(ttlMinutes))
                .maximumSize(10_000)
                .build();
    }

    /** Resolves a batch of IDs; cache hits skip the call, misses are fetched in one batch request. */
    public Map<UUID, String> resolve(Collection<UUID> ids) {
        Map<UUID, String> resolved = new HashMap<>();
        List<UUID> misses = new ArrayList<>();
        for (UUID id : ids) {
            String name = cache.getIfPresent(id);
            if (name != null) {
                resolved.put(id, name);
            } else {
                misses.add(id);
            }
        }
        if (!misses.isEmpty()) {
            for (TopicDto dto : contentClient.getTopicsByIds(misses)) {
                if (dto.id() != null && dto.name() != null) {
                    cache.put(dto.id(), dto.name());
                    resolved.put(dto.id(), dto.name());
                }
            }
        }
        return resolved;
    }

    /** Resolves a single topic's name, or {@code null} if it cannot be resolved. */
    public String resolveName(UUID id) {
        return resolve(List.of(id)).get(id);
    }
}
