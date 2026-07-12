package com.verita.contentservice.dto;

/** Provider/model switch forwarded to genai-service's internal config endpoint (ADR-0020). */
public record LlmConfigUpdateDto(String provider, String model) {}
