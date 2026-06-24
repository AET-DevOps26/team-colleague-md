package com.verita.recommendationservice.mapper;

import com.verita.model.InteractionRequest;
import com.verita.recommendationservice.entity.Interaction;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class InteractionMapper {

    private final ObjectMapper objectMapper;

    public Interaction toEntity(InteractionRequest request, UUID userId) {
        Interaction entity = new Interaction();
        entity.setUserId(userId);
        entity.setPostId(request.getPostId());
        entity.setInteractionType(request.getInteractionType().getValue());
        entity.setDurationSeconds(request.getDurationSeconds());
        entity.setScrollDepth(request.getScrollDepth());

        Map<String, Object> meta = request.getMetadata();
        if (meta != null && !meta.isEmpty()) {
            try {
                entity.setMetadata(objectMapper.writeValueAsString(meta));
            } catch (JacksonException e) {
                throw new IllegalArgumentException("Failed to serialize interaction metadata", e);
            }
        }

        return entity;
    }
}
