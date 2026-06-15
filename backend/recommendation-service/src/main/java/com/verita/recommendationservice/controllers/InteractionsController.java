package com.verita.recommendationservice.controllers;

import com.verita.api.InteractionsApi;
import com.verita.model.InteractionRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InteractionsController implements InteractionsApi {

    @Override
    public ResponseEntity<Void> trackInteraction(InteractionRequest interactionRequest) {
        // TODO: Persist interaction and forward to recommendation engine
        return ResponseEntity.accepted().build();
    }
}
