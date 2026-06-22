package com.verita.recommendationservice.controllers;

import com.verita.api.InternalApi;
import com.verita.recommendationservice.service.UserRecommendationCleanupService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class InternalController implements InternalApi {
    private final UserRecommendationCleanupService cleanupService;

    public InternalController(UserRecommendationCleanupService cleanupService) {
        this.cleanupService = cleanupService;
    }

    @Override
    public ResponseEntity<Void> deleteUserRecommendationData(UUID userId) {
        cleanupService.deleteUserData(userId);
        return ResponseEntity.noContent().build();
    }
}
