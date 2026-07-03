package com.verita.userservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Backing record for the two-step OTP password-reset flow.
 *
 * <p>{@code forgot-password} creates one row per request holding a hashed 6-digit code; a matching
 * {@code verify-reset-code} call stamps {@link #resetToken}, which {@code reset-password} then
 * consumes. At most one active row exists per user — a new request deletes the prior rows.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetTokenEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Owning user. No JPA relationship is mapped; the FK lives at the DB level (see V3 migration). */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** Bcrypt hash of the 6-digit code — never stored in plaintext. */
    @Column(nullable = false)
    private String codeHash;

    /** Single-use opaque token, set only after the code is verified. Null until then. */
    @Column(unique = true)
    private String resetToken;

    @Column(nullable = false)
    private Integer attempts = 0;

    @Column(nullable = false)
    private OffsetDateTime expiresAt;

    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
    }
}
