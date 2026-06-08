package com.verita.userservice.repository;

import com.verita.model.DigestFrequency;
import com.verita.model.UserRole;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * JPA entity representing a Verita user account.
 *
 * <p>Stores identity (username, email, hashed password), public profile fields,
 * social counters, role/ban status, refresh-token state, and notification preferences.
 * Cross-service references use {@link #id} (UUID); no database-level foreign keys
 * exist to other services.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String username;

    private String displayName;

    @Column(unique = true, nullable = false)
    private String email;

    /** Bcrypt-hashed password — never stored or returned in plaintext. */
    @Column(nullable = false)
    private String password;

    private String avatarUrl;

    @Column(length = 1000)
    private String bio;

    private String website;
    private String organisation;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_expertise", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "expertise")
    private List<String> expertiseAreas = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role = UserRole.USER;

    private Boolean isBanned = false;
    private Integer postCount = 0;
    private Integer followerCount = 0;
    private Integer followingCount = 0;
    private Integer likeReceivedCount = 0;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    @Column(unique = true)
    private String refreshToken;
    private OffsetDateTime refreshTokenExpiry;

    @Enumerated(EnumType.STRING)
    private DigestFrequency digestFrequency = DigestFrequency.WEEKLY;

    private Boolean showBookmarks = true;
    private Boolean showLikes = true;

    @PrePersist
    public void prePersist() {
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
