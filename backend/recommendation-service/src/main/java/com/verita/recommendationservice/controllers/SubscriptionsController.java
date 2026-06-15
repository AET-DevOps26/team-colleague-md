package com.verita.recommendationservice.controllers;

import com.verita.api.SubscriptionsApi;
import com.verita.model.TopicTag;
import com.verita.recommendationservice.security.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Validated
@RestController
public class SubscriptionsController implements SubscriptionsApi {

    private final SecurityUtils securityUtils;

    public SubscriptionsController(SecurityUtils securityUtils) {
        this.securityUtils = securityUtils;
    }

    @Override
    public ResponseEntity<List<TopicTag>> getSubscribedTags() {
        // TODO: Fetch tag subscriptions for the authenticated user.
        // Use securityUtils.getCurrentUserId() as the filter — never trust a userId from the request.
        return ResponseEntity.ok(new ArrayList<>());
    }

    @Override
    public ResponseEntity<Void> subscribeToTag(UUID tagId) {
        // TODO: Persist tag subscription for the authenticated user.
        // Build the TagSubscription with followerId = securityUtils.getCurrentUserId().
        // Before inserting, verify entity.getUserId().equals(securityUtils.getCurrentUserId())
        // if loading an existing record, to prevent cross-user mutation.
        return ResponseEntity.status(201).build();
    }

    @Override
    public ResponseEntity<Void> subscribeToUser(UUID userId) {
        // TODO: Persist user follow for the authenticated user.
        // Build the UserSubscription with followerId = securityUtils.getCurrentUserId().
        // Before inserting, verify entity.getFollowerId().equals(securityUtils.getCurrentUserId())
        // if loading an existing record, to prevent cross-user mutation.
        return ResponseEntity.status(201).build();
    }

    @Override
    public ResponseEntity<Void> unsubscribeFromTag(UUID tagId) {
        // TODO: Remove tag subscription for the authenticated user.
        // Load the TagSubscription, then verify entity.getUserId().equals(securityUtils.getCurrentUserId())
        // before deleting — return 403 or 404 if the check fails.
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> unsubscribeFromUser(UUID userId) {
        // TODO: Remove user follow for the authenticated user.
        // Load the UserSubscription, then verify entity.getFollowerId().equals(securityUtils.getCurrentUserId())
        // before deleting — return 403 or 404 if the check fails.
        return ResponseEntity.noContent().build();
    }
}
