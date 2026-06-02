package com.verita.contentservice.dto;
import java.util.UUID;
public record AuthorSummary(UUID id, String username, String displayName, String avatarUrl, String role, String organisation) {}
