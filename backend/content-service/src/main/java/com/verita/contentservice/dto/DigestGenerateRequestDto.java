package com.verita.contentservice.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record DigestGenerateRequestDto(
        String requestId,
        String userId,
        LocalDate digestDate,
        OffsetDateTime periodStart,
        OffsetDateTime periodEnd,
        String timezone,
        List<DigestTopicDto> topics,
        int maxSourcesPerTopic,
        int maxEvents,
        String tone
) {}
