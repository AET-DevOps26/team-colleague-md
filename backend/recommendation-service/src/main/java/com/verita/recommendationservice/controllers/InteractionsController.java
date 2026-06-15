package com.verita.recommendationservice.controllers;

import com.verita.api.InteractionsApi;
import com.verita.model.InteractionRequest;
import com.verita.recommendationservice.service.InteractionService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
public class InteractionsController implements InteractionsApi {

    private final InteractionService interactionService;

    public InteractionsController(InteractionService interactionService) {
        this.interactionService = interactionService;
    }

    @Override
    public ResponseEntity<Void> trackInteraction(InteractionRequest interactionRequest) {
        interactionService.process(interactionRequest);
        return ResponseEntity.accepted().build();
    }
}
