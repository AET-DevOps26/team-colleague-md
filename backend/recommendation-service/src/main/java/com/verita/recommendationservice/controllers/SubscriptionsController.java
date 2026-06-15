package com.verita.recommendationservice.controllers;

import com.verita.api.SubscriptionsApi;
import com.verita.model.TopicTag;
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
    public ResponseEntity<List<TopicTag>> getSubscribedTags() {
        UUID userId = securityUtils.getCurrentUserId();
        List<TopicTag> tags = subscriptionService.getSubscribedTags(userId).stream()
                .map(sub -> new TopicTag().id(sub.getTagId()).name(""))
                .toList();
        return ResponseEntity.ok(tags);
    }

    @Override
    public ResponseEntity<Void> subscribeToTag(UUID tagId) {
        subscriptionService.subscribeToTag(securityUtils.getCurrentUserId(), tagId);
        return ResponseEntity.status(201).build();
    }

    @Override
    public ResponseEntity<Void> subscribeToUser(UUID userId) {
        subscriptionService.subscribeToUser(securityUtils.getCurrentUserId(), userId);
        return ResponseEntity.status(201).build();
    }

    @Override
    public ResponseEntity<Void> unsubscribeFromTag(UUID tagId) {
        subscriptionService.unsubscribeFromTag(tagId, securityUtils.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> unsubscribeFromUser(UUID userId) {
        subscriptionService.unsubscribeFromUser(userId, securityUtils.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }
}
