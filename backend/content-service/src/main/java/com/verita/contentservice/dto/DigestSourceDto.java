package com.verita.contentservice.dto;

import java.time.OffsetDateTime;

/** One structured source cited by a digest event, as returned by genai-service (ADR-0019). */
public record DigestSourceDto(
        String url,
        String sourceName,
        String provider,
        OffsetDateTime publishedAt,
        String title
) {}
