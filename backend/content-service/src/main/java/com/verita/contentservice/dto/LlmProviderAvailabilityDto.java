package com.verita.contentservice.dto;

/** One supported GenAI provider and whether its API key is present (keyless ones cannot be selected). */
public record LlmProviderAvailabilityDto(String name, boolean configured) {}
