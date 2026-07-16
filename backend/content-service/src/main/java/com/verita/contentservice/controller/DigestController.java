package com.verita.contentservice.controller;

import com.verita.api.DigestsApi;
import com.verita.contentservice.service.DailyDigestGenerationService;
import com.verita.contentservice.service.digest.DigestService;
import com.verita.model.CreateDigestRequest;
import com.verita.model.DigestDetail;
import com.verita.model.DigestGenerationResponse;
import com.verita.model.DigestSummary;
import com.verita.model.DigestSummaryPage;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
public class DigestController implements DigestsApi {
    private final DigestService digestService;
    private final DailyDigestGenerationService generationService;

    /**
     * Persists a service-supplied digest while replacing its legacy caller title with the
     * deterministic content-service title.
     *
     * @deprecated Scheduled and admin generation persist in-process; retained for service-client
     *     compatibility only.
     */
    @Deprecated(forRemoval = false)
    @Override
    public ResponseEntity<DigestDetail> createDigest(@Valid CreateDigestRequest createDigestRequest) {
        return ResponseEntity.status(201).body(digestService.createDigest(createDigestRequest));
    }

    @Override
    public ResponseEntity<DigestGenerationResponse> generateUserDigest(UUID userId, Boolean force) {
        return ResponseEntity.ok(generationService.generateForUser(userId, Boolean.TRUE.equals(force)));
    }

    @Override
    public ResponseEntity<DigestDetail> getDigestById(UUID id) {
        return ResponseEntity.ok(digestService.getDigestById(id));
    }

    @Override
    public ResponseEntity<DigestSummaryPage> getMyDigests(Integer page, Integer size) {
        int p = page == null ? 0 : page;
        int s = size == null ? 10 : size;
        return ResponseEntity.ok(digestService.getMyDigests(p, s));
    }

    @Override
    public ResponseEntity<DigestSummary> getPublicTodayDigest() {
        return ResponseEntity.ok(digestService.getPublicTodayDigest());
    }
}
