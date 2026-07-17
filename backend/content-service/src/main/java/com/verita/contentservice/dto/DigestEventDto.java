package com.verita.contentservice.dto;

import java.util.List;

public record DigestEventDto(
        String headline,
        List<String> summaryBullets,
        List<String> topicIds,
        List<DigestSourceDto> sources
) {}
