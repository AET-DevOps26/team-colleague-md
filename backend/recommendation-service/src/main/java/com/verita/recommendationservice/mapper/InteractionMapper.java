package com.verita.recommendationservice.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.verita.model.InteractionRequest;
import com.verita.recommendationservice.entities.Interaction;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
public class InteractionMapper {

    private final ObjectMapper objectMapper;

    public InteractionMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Interaction toEntity(InteractionRequest request, UUID userId) {
        Interaction entity = new Interaction();
        entity.setUserId(userId);
        entity.setPostId(request.getPostId());
        entity.setInteractionType(request.getInteractionType().getValue());

        Map<String, Object> meta = request.getMetadata();
        if (meta != null && !meta.isEmpty()) {
            try {
                entity.setMetadata(objectMapper.writeValueAsString(meta));
            } catch (JsonProcessingException e) {
                throw new IllegalArgumentException("Failed to serialize interaction metadata", e);
            }
        }

        return entity;
    }
}
