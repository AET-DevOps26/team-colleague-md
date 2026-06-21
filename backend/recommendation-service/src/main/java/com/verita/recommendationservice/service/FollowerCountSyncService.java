package com.verita.recommendationservice.service;

import com.verita.recommendationservice.service.feed.TopicNameResolver;

import com.verita.recommendationservice.client.ContentClient;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Best-effort, asynchronous propagation of topic follower-count deltas to content-service on
 * subscribe/unsubscribe (ADR-0002). The local subscription is the source of truth and has already
 * committed; this fires after it and never affects the user's request. content keys the count by
 * topic name, so the id is resolved first. Failures (incl. an unresolvable name) are logged and
 * swallowed — the count is an eventually-consistent denormalisation.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class FollowerCountSyncService {

    private final ContentClient contentClient;
    private final TopicNameResolver topicNameResolver;

    @Async("interactionExecutor")
    public void syncTopicDelta(UUID topicId, int delta, String authorization) {
        try {
            String name = topicNameResolver.resolveName(topicId);
            if (name == null) {
                log.warn("Skipping follower-count sync for topic {} (delta {}): name unresolved", topicId, delta);
                return;
            }
            contentClient.applyFollowerCountDelta(name, delta, authorization);
        } catch (Exception e) {
            log.warn("Best-effort follower-count sync failed for topic {} (delta {}): {}",
                    topicId, delta, e.getMessage());
        }
    }
}
