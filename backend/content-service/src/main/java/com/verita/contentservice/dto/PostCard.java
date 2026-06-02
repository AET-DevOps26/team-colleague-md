package com.verita.contentservice.dto;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
public record PostCard(UUID id, AuthorSummary author, String title, String excerpt, String coverImageUrl, List<TagDto> tags, Integer readTimeMinutes, long likeCount, long commentCount, long viewCount, boolean isLikedByMe, OffsetDateTime createdAt) {}
