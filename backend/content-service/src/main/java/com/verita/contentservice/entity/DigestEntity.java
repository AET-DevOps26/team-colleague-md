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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Standalone daily digest (ADR-0019). Decoupled from {@code posts}: the whole {@code events} array
 * is always read/written as one JSONB unit, while {@code preview_headlines} is denormalized at write
 * time so list/card reads never load the events blob.
 */
@Getter
@Setter
@Entity
@Table(name = "digests")
public class DigestEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "digest_type", nullable = false)
    private DigestTypeValue digestType;

    // PUBLIC => null; PERSONAL => set. Enforced by a CHECK constraint on the table.
    @Column(name = "target_user_id")
    private UUID targetUserId;

    @Column(name = "digest_date", nullable = false)
    private LocalDate digestDate;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String subtitle;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<DigestEventData> events = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<DigestTopicData> topics = new ArrayList<>();

    @Column(name = "event_count", nullable = false)
    private int eventCount;

    @Column(name = "source_count", nullable = false)
    private int sourceCount;

    @Column(name = "read_time_min", nullable = false)
    private int readTimeMin;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "preview_headlines", columnDefinition = "text[]")
    private List<String> previewHeadlines = new ArrayList<>();

    private String model;

    @Column(name = "generated_at")
    private OffsetDateTime generatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
