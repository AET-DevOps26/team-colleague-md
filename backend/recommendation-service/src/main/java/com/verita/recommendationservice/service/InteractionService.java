package com.verita.recommendationservice.service;

import com.verita.model.InteractionRequest;
import com.verita.recommendationservice.mapper.InteractionMapper;
import com.verita.recommendationservice.repository.InteractionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class InteractionService {

    private static final Logger log = LoggerFactory.getLogger(InteractionService.class);

    private final InteractionMapper interactionMapper;
    private final InteractionRepository interactionRepository;

    public InteractionService(InteractionMapper interactionMapper, InteractionRepository interactionRepository) {
        this.interactionMapper = interactionMapper;
        this.interactionRepository = interactionRepository;
    }

    @Async("interactionExecutor")
    public void process(InteractionRequest request, UUID userId) {
        try {
            log.debug("Processing interaction: type={} postId={}", request.getInteractionType(), request.getPostId());
            interactionRepository.save(interactionMapper.toEntity(request, userId));
        } catch (Exception ex) {
            log.error("Failed to process interaction: type={} postId={}", request.getInteractionType(), request.getPostId(), ex);
        }
    }
}
