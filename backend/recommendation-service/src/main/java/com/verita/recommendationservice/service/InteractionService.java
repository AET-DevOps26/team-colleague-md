package com.verita.recommendationservice.service;

import com.verita.model.InteractionRequest;
import com.verita.recommendationservice.mapper.InteractionMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class InteractionService {

    private final InteractionMapper interactionMapper;
    private final InteractionBuffer interactionBuffer;

    @Async("interactionExecutor")
    public void process(InteractionRequest request, UUID userId) {
        try {
            log.debug("Buffering interaction: type={} postId={}", request.getInteractionType(), request.getPostId());
            // Hand off to the buffer; the actual DB write is batched (see InteractionBuffer).
            interactionBuffer.add(interactionMapper.toEntity(request, userId));
        } catch (Exception ex) {
            log.error("Failed to buffer interaction: type={} postId={}", request.getInteractionType(), request.getPostId(), ex);
        }
    }
}
