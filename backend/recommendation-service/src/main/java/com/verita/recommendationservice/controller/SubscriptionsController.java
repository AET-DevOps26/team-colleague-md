package com.verita.recommendationservice.controller;

import com.verita.api.SubscriptionsApi;
import com.verita.model.Topic;
import com.verita.recommendationservice.entity.TopicSubscription;
import com.verita.recommendationservice.security.SecurityUtils;
import com.verita.recommendationservice.service.FollowerCountSyncService;
import com.verita.recommendationservice.service.SubscriptionService;
import com.verita.recommendationservice.service.feed.TopicNameResolver;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Validated
@RestController
@RequiredArgsConstructor
public class SubscriptionsController implements SubscriptionsApi {

    private final SecurityUtils securityUtils;
    private final SubscriptionService subscriptionService;
    private final TopicNameResolver topicNameResolver;
    private final FollowerCountSyncService followerCountSyncService;

    @Override
    public ResponseEntity<List<Topic>> getSubscribedTopics() {
        UUID userId = securityUtils.getCurrentUserId();
        List<TopicSubscription> subscriptions = subscriptionService.getSubscribedTopics(userId);

        // Resolve display names from content-service, fall back to "" for any unresolved id.
        Map<UUID, String> names = topicNameResolver.resolve(
                subscriptions.stream().map(TopicSubscription::getTopicId).toList());

        List<Topic> topics = subscriptions.stream()
                .map(sub -> new Topic().id(sub.getTopicId()).name(names.getOrDefault(sub.getTopicId(), "")))
                .toList();
        return ResponseEntity.ok(topics);
    }

    @Override
    public ResponseEntity<Void> subscribeToTopic(UUID topicId) {
        boolean created = subscriptionService.subscribeToTopic(securityUtils.getCurrentUserId(), topicId);
        if (created) {
            // Best-effort, async follower-count sync — only on a real new subscription (ADR-0002).
            followerCountSyncService.syncTopicDelta(topicId, +1, currentAuthorization());
        }
        return ResponseEntity.status(201).build();
    }

    @Override
    public ResponseEntity<Void> subscribeToUser(UUID userId) {
        subscriptionService.subscribeToUser(securityUtils.getCurrentUserId(), userId);
        return ResponseEntity.status(201).build();
    }

    @Override
    public ResponseEntity<Void> unsubscribeFromTopic(UUID topicId) {
        // Throws 404 if there was nothing to remove; reaching past it means a row was deleted.
        subscriptionService.unsubscribeFromTopic(securityUtils.getCurrentUserId(), topicId);
        followerCountSyncService.syncTopicDelta(topicId, -1, currentAuthorization());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> unsubscribeFromUser(UUID userId) {
        subscriptionService.unsubscribeFromUser(securityUtils.getCurrentUserId(), userId);
        return ResponseEntity.noContent().build();
    }

    /** Captures the current request's bearer token to forward on the async cross-service call. */
    private String currentAuthorization() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            HttpServletRequest request = attrs.getRequest();
            return request.getHeader(HttpHeaders.AUTHORIZATION);
        }
        return null;
    }
}
