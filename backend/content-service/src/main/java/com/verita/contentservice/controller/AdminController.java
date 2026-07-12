package com.verita.contentservice.controller;

import com.verita.api.AdminApi;
import com.verita.contentservice.service.AdminService;
import com.verita.contentservice.service.PostService;
import com.verita.model.FailedSummaryPage;
import com.verita.model.LlmConfig;
import com.verita.model.LlmConfigUpdateRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only operations surface (ADR-0020); the ADMIN role is enforced in SecurityConfig. */
@RestController
@Validated
@RequiredArgsConstructor
public class AdminController implements AdminApi {
    private final AdminService adminService;
    private final PostService postService;

    @Override
    public ResponseEntity<LlmConfig> getLlmConfig() {
        return ResponseEntity.ok(adminService.getLlmConfig());
    }

    @Override
    public ResponseEntity<LlmConfig> updateLlmConfig(@Valid LlmConfigUpdateRequest llmConfigUpdateRequest) {
        return ResponseEntity.ok(adminService.updateLlmConfig(llmConfigUpdateRequest));
    }

    @Override
    public ResponseEntity<FailedSummaryPage> listFailedSummaries(Integer page, Integer size) {
        return ResponseEntity.ok(postService.listFailedSummaries(page == null ? 0 : page, size == null ? 20 : size));
    }

    /** Queues the summary and returns immediately; the client polls GET /api/v1/posts/{id}/summary. */
    @Override
    public ResponseEntity<Void> resummarizePost(UUID id) {
        postService.requestSummaryRegeneration(id);
        return ResponseEntity.accepted().build();
    }

    /** Generation runs in the background (it is far too slow for a request thread); 202 immediately. */
    @Override
    public ResponseEntity<Void> adminGenerateUserDigest(UUID userId, Boolean force) {
        adminService.generateUserDigestAsync(userId, Boolean.TRUE.equals(force));
        return ResponseEntity.accepted().build();
    }
}
