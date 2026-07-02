package com.verita.contentservice.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record DigestGenerateResponseDto(
        LocalDate digestDate,
        OffsetDateTime periodStart,
        OffsetDateTime periodEnd,
        String title,
        String topStorySubtitle,
        String summary,
        List<DigestTopicDto> topics,
        List<DigestEventDto> events,
        int eventCount,
        int sourceCount,
        int readTimeMinutes,
        OffsetDateTime generatedAt,
        String model
) {}
