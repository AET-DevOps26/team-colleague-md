package com.verita.recommendationservice.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(
    name = "interactions",
    indexes = {
        @Index(name = "idx_interactions_user_post", columnList = "user_id, post_id"),
        @Index(name = "idx_interactions_post_type", columnList = "post_id, interaction_type")
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
}
