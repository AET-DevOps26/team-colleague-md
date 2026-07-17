package com.verita.contentservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Assigns the day's PUBLIC digest to a zero-subscription user (ADR-0018/0019). Personal and public
 * are mutually exclusive per user per day, enforced by the {@code (user_id, digest_date)} primary key.
 */
@Getter
@Setter
@Entity
@Table(name = "digest_assignments")
@NoArgsConstructor
public class DigestAssignmentEntity {
    @EmbeddedId
    private DigestAssignmentId id;

    // References the PUBLIC digests.id row; no DB-level FK (cross-aggregate reference).
    @Column(name = "digest_id", nullable = false)
    private UUID digestId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public DigestAssignmentEntity(DigestAssignmentId id, UUID digestId) {
        this.id = id;
        this.digestId = digestId;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
