package com.verita.recommendationservice.dto;

import java.util.UUID;

class InteractionRequest {
    private UUID postId;
    private String interactionType;
    private Integer durationSeconds;
    private Integer scrollDepth;

    public UUID getPostId() { return postId; }
    public void setPostId(UUID postId) { this.postId = postId; }
    public String getInteractionType() { return interactionType; }
    public void setInteractionType(String interactionType) { this.interactionType = interactionType; }
    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }
    public Integer getScrollDepth() { return scrollDepth; }
    public void setScrollDepth(Integer scrollDepth) { this.scrollDepth = scrollDepth; }
}
