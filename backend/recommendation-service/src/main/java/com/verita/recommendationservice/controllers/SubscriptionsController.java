package com.verita.recommendationservice.controllers;

import com.verita.api.SubscriptionsApi;
import com.verita.model.Topic;
import com.verita.recommendationservice.security.SecurityUtils;
import com.verita.recommendationservice.service.SubscriptionService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Validated
@RestController
public class SubscriptionsController implements SubscriptionsApi {

    private final SecurityUtils securityUtils;
    private final SubscriptionService subscriptionService;

    public SubscriptionsController(SecurityUtils securityUtils, SubscriptionService subscriptionService) {
        this.securityUtils = securityUtils;
        this.subscriptionService = subscriptionService;
    }

    @Override
    public ResponseEntity<List<Topic>> getSubscribedTopics() {
        UUID userId = securityUtils.getCurrentUserId();
        List<Topic> topics = subscriptionService.getSubscribedTopics(userId).stream()
                .map(sub -> new Topic().id(sub.getTopicId()).name(""))
                .toList();
        return ResponseEntity.ok(topics);
    }

    @Override
    public ResponseEntity<Void> subscribeToTopic(UUID topicId) {
        subscriptionService.subscribeToTopic(securityUtils.getCurrentUserId(), topicId);
        return ResponseEntity.status(201).build();
    }

    @Override
    public ResponseEntity<Void> subscribeToUser(UUID userId) {
        subscriptionService.subscribeToUser(securityUtils.getCurrentUserId(), userId);
        return ResponseEntity.status(201).build();
    }

    @Override
    public ResponseEntity<Void> unsubscribeFromTopic(UUID topicId) {
        subscriptionService.unsubscribeFromTopic(topicId, securityUtils.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> unsubscribeFromUser(UUID userId) {
        subscriptionService.unsubscribeFromUser(userId, securityUtils.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }
}
