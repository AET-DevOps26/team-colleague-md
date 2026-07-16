package com.verita.userservice.repository;

import com.verita.userservice.entity.UserEntity;
import com.verita.model.DigestFrequency;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, UUID> {

    Optional<UserEntity> findByUsername(String username);

    Optional<UserEntity> findByEmail(String email);

    Boolean existsByUsername(String username);

    Boolean existsByEmail(String email);

    Optional<UserEntity> findByRefreshToken(String refreshToken);

    Page<UserEntity> findByDigestFrequency(DigestFrequency digestFrequency, Pageable pageable);

    Page<UserEntity> findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(
            String username, String displayName, Pageable pageable);

    /** Clamped self-increment of the author's published-post count; no-op if the user is gone. */
    @Modifying
    @Query("UPDATE UserEntity u SET u.postCount = GREATEST(0, u.postCount + :delta) WHERE u.id = :id")
    int applyPostCountDelta(@Param("id") UUID id, @Param("delta") int delta);

    /** Clamped self-increment of likes received across the author's posts; no-op if the user is gone. */
    @Modifying
    @Query("UPDATE UserEntity u SET u.likeReceivedCount = GREATEST(0, u.likeReceivedCount + :delta) WHERE u.id = :id")
    int applyLikeReceivedCountDelta(@Param("id") UUID id, @Param("delta") int delta);
}
