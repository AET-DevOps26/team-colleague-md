package com.verita.recommendationservice.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.UUID;

/** Minimal topic shape returned by content-service {@code GET /api/v1/topics/by-ids}. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TopicDto(UUID id, String name) {
}
