package com.verita.recommendationservice.controller;

import com.verita.api.InternalApi;
import com.verita.model.TopicSubscriptionResponse;
import com.verita.recommendationservice.entity.TopicSubscription;
import com.verita.recommendationservice.service.SubscriptionService;
import com.verita.recommendationservice.service.UserRecommendationCleanupService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class InternalController implements InternalApi {
    private final UserRecommendationCleanupService cleanupService;
    private final SubscriptionService subscriptionService;

    public InternalController(UserRecommendationCleanupService cleanupService,
                              SubscriptionService subscriptionService) {
        this.cleanupService = cleanupService;
        this.subscriptionService = subscriptionService;
    }

    @Override
    public ResponseEntity<Void> deleteUserRecommendationData(UUID userId) {
        cleanupService.deleteUserData(userId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<List<TopicSubscriptionResponse>> getUserTopicSubscriptions(UUID userId) {
        return ResponseEntity.ok(subscriptionService.getSubscribedTopics(userId).stream()
                .map(TopicSubscription::getTopicId)
                .map(TopicSubscriptionResponse::new)
                .toList());
    }

    @Override
    public ResponseEntity<List<TopicSubscriptionResponse>> getTrendingTopics(Integer limit) {
        int cappedLimit = limit == null ? 8 : limit;
        return ResponseEntity.ok(subscriptionService.getTrendingTopicIds(cappedLimit).stream()
                .map(TopicSubscriptionResponse::new)
                .toList());
    }
}
