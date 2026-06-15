package com.verita.recommendationservice.controllers;

import com.verita.api.InteractionsApi;
import com.verita.model.InteractionRequest;
import com.verita.recommendationservice.security.SecurityUtils;
import com.verita.recommendationservice.service.InteractionService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
public class InteractionsController implements InteractionsApi {

    private final InteractionService interactionService;
    private final SecurityUtils securityUtils;

    public InteractionsController(InteractionService interactionService, SecurityUtils securityUtils) {
        this.interactionService = interactionService;
        this.securityUtils = securityUtils;
    }

    @Override
    public ResponseEntity<Void> trackInteraction(InteractionRequest interactionRequest) {
        interactionService.process(interactionRequest, securityUtils.getCurrentUserId());
        return ResponseEntity.accepted().build();
    }
}
