package com.verita.contentservice.domain;
import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.OffsetDateTime;
@MappedSuperclass
abstract class BaseTimeEntity {
    @Column(nullable = false, updatable = false)
    protected OffsetDateTime createdAt;
    @Column(nullable = false)
    protected OffsetDateTime updatedAt;
    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = createdAt;
    }
    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
