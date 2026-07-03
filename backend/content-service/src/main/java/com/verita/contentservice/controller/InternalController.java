package com.verita.contentservice.controller;

import com.verita.api.InternalApi;
import com.verita.contentservice.service.UserContentCleanupService;
import com.verita.contentservice.service.DailyDigestGenerationService;
import com.verita.model.DigestGenerationResponse;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InternalController implements InternalApi {
    private final UserContentCleanupService cleanupService;
    private final DailyDigestGenerationService digestGenerationService;

    public InternalController(UserContentCleanupService cleanupService,
                              DailyDigestGenerationService digestGenerationService) {
        this.cleanupService = cleanupService;
        this.digestGenerationService = digestGenerationService;
    }

    @Override
    public ResponseEntity<Void> deleteUserContentData(UUID userId) {
        cleanupService.deleteUserData(userId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<DigestGenerationResponse> generateUserDigest(UUID userId, Boolean force) {
        return ResponseEntity.ok(digestGenerationService.generateForUser(userId, Boolean.TRUE.equals(force)));
    }
}
