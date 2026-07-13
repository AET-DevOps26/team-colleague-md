package com.verita.contentservice.dto;

import java.util.List;

/** genai-service's live LLM configuration, as returned by its internal config endpoint (ADR-0020). */
public record LlmConfigDto(
        String provider,
        String model,
        Float temperature,
        List<LlmProviderAvailabilityDto> availableProviders
) {}
