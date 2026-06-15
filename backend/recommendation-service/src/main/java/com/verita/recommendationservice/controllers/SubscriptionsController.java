package com.verita.recommendationservice.controllers;

import com.verita.api.SubscriptionsApi;
import com.verita.model.TopicTag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
public class SubscriptionsController implements SubscriptionsApi {

    @Override
    public ResponseEntity<List<TopicTag>> getSubscribedTags() {
        // TODO: Fetch tag subscriptions for the authenticated user
        return ResponseEntity.ok(new ArrayList<>());
    }

    @Override
    public ResponseEntity<Void> subscribeToTag(UUID tagId) {
        // TODO: Persist tag subscription for the authenticated user
        return ResponseEntity.status(201).build();
    }

    @Override
    public ResponseEntity<Void> subscribeToUser(UUID userId) {
        // TODO: Persist user follow for the authenticated user
        return ResponseEntity.status(201).build();
    }

    @Override
    public ResponseEntity<Void> unsubscribeFromTag(UUID tagId) {
        // TODO: Remove tag subscription for the authenticated user
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> unsubscribeFromUser(UUID userId) {
        // TODO: Remove user follow for the authenticated user
        return ResponseEntity.noContent().build();
    }
}
