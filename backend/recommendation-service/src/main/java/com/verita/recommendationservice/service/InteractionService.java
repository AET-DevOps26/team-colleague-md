package com.verita.recommendationservice.service;

import com.verita.model.InteractionRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class InteractionService {

    private static final Logger log = LoggerFactory.getLogger(InteractionService.class);

    @Async("interactionExecutor")
    public void process(InteractionRequest request) {
        try {
            // TODO: persist to interactions table and forward to recommendation engine
            log.debug("Processing interaction: type={} postId={}", request.getInteractionType(), request.getPostId());
        } catch (Exception ex) {
            log.error("Failed to process interaction: type={} postId={}", request.getInteractionType(), request.getPostId(), ex);
        }
    }
}
