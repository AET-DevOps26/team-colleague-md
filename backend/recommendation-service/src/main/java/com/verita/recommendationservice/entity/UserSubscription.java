package com.verita.recommendationservice.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Getter
@Setter
@NoArgsConstructor
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
}
