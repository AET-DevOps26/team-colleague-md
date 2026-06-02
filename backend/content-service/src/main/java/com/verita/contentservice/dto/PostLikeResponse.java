package com.verita.contentservice.dto;
public record PostLikeResponse(long likeCount, long dislikeCount, boolean isLikedByMe, boolean isDislikedByMe) {}
