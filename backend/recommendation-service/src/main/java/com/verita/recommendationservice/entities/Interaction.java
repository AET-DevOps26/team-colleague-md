package com.verita.recommendationservice.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "interactions",
    indexes = {
        @Index(name = "idx_interactions_user_post", columnList = "user_id, post_id"),
        @Index(name = "idx_interactions_post_type", columnList = "post_id, interaction_type"),
        @Index(name = "idx_interactions_created_at", columnList = "created_at")
    }
)
public class Interaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "post_id", nullable = false)
    private UUID postId;

    @Column(name = "interaction_type", nullable = false, length = 32)
    private String interactionType;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "scroll_depth")
    private Integer scrollDepth;

    // Stored as JSON text; SqlTypes.JSON binds the String to the jsonb column
    // (Postgres rejects a plain varchar bind into a jsonb column).
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String metadata;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ DEFAULT NOW()")
    private OffsetDateTime createdAt;

    public UUID getId() { return id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public UUID getPostId() { return postId; }
    public void setPostId(UUID postId) { this.postId = postId; }

    public String getInteractionType() { return interactionType; }
    public void setInteractionType(String interactionType) { this.interactionType = interactionType; }

    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }

    public Integer getScrollDepth() { return scrollDepth; }
    public void setScrollDepth(Integer scrollDepth) { this.scrollDepth = scrollDepth; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
