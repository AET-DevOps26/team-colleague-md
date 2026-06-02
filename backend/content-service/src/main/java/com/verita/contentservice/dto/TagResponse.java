package com.verita.contentservice.dto;
import java.util.UUID;
public record TagResponse(UUID id, String name, long usageCount) {}
