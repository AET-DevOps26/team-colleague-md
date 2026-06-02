package com.verita.contentservice.dto;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
public record PostResponse(UUID id, AuthorSummary author, String status, String title, String excerpt, String content, String coverImageUrl, List<TagDto> tags, List<String> sourceUrl, Integer readTimeMinutes, long likeCount, long dislikeCount, long commentCount, long viewCount, long saveCount, boolean isLikedByMe, boolean isDislikedByMe, boolean isBookmarkedByMe, OffsetDateTime createdAt, OffsetDateTime updatedAt, String contentSummary) {}
