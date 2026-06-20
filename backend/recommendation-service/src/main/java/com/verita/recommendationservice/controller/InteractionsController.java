package com.verita.recommendationservice.controller;

import com.verita.api.InteractionsApi;
import com.verita.model.InteractionRequest;
import com.verita.recommendationservice.exception.RateLimitExceededException;
import com.verita.recommendationservice.ratelimit.RateLimiter;
import com.verita.recommendationservice.security.SecurityUtils;
import com.verita.recommendationservice.service.InteractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Validated
@RestController
@RequiredArgsConstructor
public class InteractionsController implements InteractionsApi {

    private final InteractionService interactionService;
    private final SecurityUtils securityUtils;
    private final RateLimiter rateLimiter;

    @Override
    public ResponseEntity<Void> trackInteraction(InteractionRequest interactionRequest) {
        UUID userId = securityUtils.getCurrentUserId();
        if (!rateLimiter.tryAcquire(userId)) {
            throw new RateLimitExceededException("Interaction tracking rate limit exceeded");
        }
        interactionService.process(interactionRequest, userId);
        return ResponseEntity.accepted().build();
    }
}
