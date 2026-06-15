package com.verita.recommendationservice.entities;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "tag_subscriptions",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_tag_subscriptions_user_tag",
        columnNames = {"user_id", "tag_id"}
    ),
    indexes = @Index(name = "idx_tag_subscriptions_user_id", columnList = "user_id")
)
public class TagSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "tag_id", nullable = false)
    private UUID tagId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public UUID getId() { return id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public UUID getTagId() { return tagId; }
    public void setTagId(UUID tagId) { this.tagId = tagId; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
