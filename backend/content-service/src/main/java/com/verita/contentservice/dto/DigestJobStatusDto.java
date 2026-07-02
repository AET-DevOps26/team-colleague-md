package com.verita.contentservice.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record DigestJobStatusDto(
        String jobId,
        String status,
        OffsetDateTime submittedAt,
        List<DigestJobWarningDto> warnings,
        String requestId,
        String userId,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt,
        DigestGenerateResponseDto result,
        DigestJobErrorDto error
) {}
