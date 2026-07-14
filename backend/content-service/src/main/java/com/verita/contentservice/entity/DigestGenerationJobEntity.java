package com.verita.contentservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/** One admin-triggered digest generation run (ADR-0020); see {@link DigestJobStatus}. */
@Getter
@Setter
@Entity
@Table(name = "digest_generation_jobs")
public class DigestGenerationJobEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "target_user_id", nullable = false)
    private UUID targetUserId;

    @Column(name = "digest_date", nullable = false)
    private LocalDate digestDate;

    @Column(name = "force_rerun", nullable = false)
    private boolean forceRerun;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private DigestJobStatus status = DigestJobStatus.PENDING;

    /** The orchestration's own words: why it was skipped, or what broke. */
    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "finished_at")
    private OffsetDateTime finishedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
