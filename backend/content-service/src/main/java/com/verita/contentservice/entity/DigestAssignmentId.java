package com.verita.contentservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Composite key for {@link DigestAssignmentEntity}: one assignment per user per day. */
@Getter
@Setter
@Embeddable
@NoArgsConstructor
public class DigestAssignmentId implements Serializable {
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "digest_date", nullable = false)
    private LocalDate digestDate;

    public DigestAssignmentId(UUID userId, LocalDate digestDate) {
        this.userId = userId;
        this.digestDate = digestDate;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof DigestAssignmentId that)) return false;
        return Objects.equals(userId, that.userId) && Objects.equals(digestDate, that.digestDate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, digestDate);
    }
}
