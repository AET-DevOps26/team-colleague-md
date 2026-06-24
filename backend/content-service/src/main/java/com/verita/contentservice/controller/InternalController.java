package com.verita.contentservice.controller;

import com.verita.api.InternalApi;
import com.verita.contentservice.service.UserContentCleanupService;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InternalController implements InternalApi {
    private final UserContentCleanupService cleanupService;

    public InternalController(UserContentCleanupService cleanupService) {
        this.cleanupService = cleanupService;
    }

    @Override
    public ResponseEntity<Void> deleteUserContentData(UUID userId) {
        cleanupService.deleteUserData(userId);
        return ResponseEntity.noContent().build();
    }
}
