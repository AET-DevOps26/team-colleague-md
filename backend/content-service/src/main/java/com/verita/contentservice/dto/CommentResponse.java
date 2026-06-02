package com.verita.contentservice.dto;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
public record CommentResponse(UUID id, AuthorSummary author, String text, long likeCount, boolean isLikedByMe, OffsetDateTime createdAt, List<CommentResponse> replies) {}
