package com.verita.userservice.repository;

import com.verita.userservice.entity.PasswordResetTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, UUID> {

    Optional<PasswordResetTokenEntity> findByUserId(UUID userId);

    Optional<PasswordResetTokenEntity> findByResetToken(String resetToken);

    /** Removes any existing reset rows for a user (one active request per user). */
    void deleteByUserId(UUID userId);
}
