package com.verita.recommendationservice.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "user_subscriptions",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_user_subscriptions_pair",
        columnNames = {"follower_id", "followed_id"}
    ),
    indexes = @Index(name = "idx_user_subscriptions_followed", columnList = "followed_id")
)
public class UserSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "follower_id", nullable = false)
    private UUID followerId;

    @Column(name = "followed_id", nullable = false)
    private UUID followedId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ DEFAULT NOW()")
    private OffsetDateTime createdAt;

    public UUID getId() { return id; }

    public UUID getFollowerId() { return followerId; }
    public void setFollowerId(UUID followerId) { this.followerId = followerId; }

    public UUID getFollowedId() { return followedId; }
    public void setFollowedId(UUID followedId) { this.followedId = followedId; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
