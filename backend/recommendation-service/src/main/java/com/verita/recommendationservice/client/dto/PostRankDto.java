package com.verita.recommendationservice.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * The subset of content-service's {@code PostResponse} that feed ranking needs: identity,
 * engagement counts, and recency. All other fields are ignored.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PostRankDto(
        UUID id,
        Integer likeCount,
        Integer commentCount,
        Integer viewCount,
        OffsetDateTime createdAt) {

    public int likes() { return likeCount == null ? 0 : likeCount; }

    public int comments() { return commentCount == null ? 0 : commentCount; }

    public int views() { return viewCount == null ? 0 : viewCount; }
}
