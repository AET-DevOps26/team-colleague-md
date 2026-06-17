package com.verita.recommendationservice.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "topic_subscriptions",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_topic_subscriptions_user_topic",
        columnNames = {"user_id", "topic_id"}
    )
)
public class TopicSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "topic_id", nullable = false)
    private UUID topicId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ DEFAULT NOW()")
    private OffsetDateTime createdAt;

    public UUID getId() { return id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public UUID getTopicId() { return topicId; }
    public void setTopicId(UUID topicId) { this.topicId = topicId; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
