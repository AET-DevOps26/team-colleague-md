package com.verita.contentservice.dto;

/** One supported GenAI provider and whether its required connection setting is present. */
public record LlmProviderAvailabilityDto(String name, boolean configured) {}
