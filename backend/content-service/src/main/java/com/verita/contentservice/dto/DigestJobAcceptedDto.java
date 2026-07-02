package com.verita.contentservice.dto;

import java.time.OffsetDateTime;

public record DigestJobAcceptedDto(
        String jobId,
        String status,
        String statusUrl,
        OffsetDateTime submittedAt,
        String requestId,
        String userId
) {}
