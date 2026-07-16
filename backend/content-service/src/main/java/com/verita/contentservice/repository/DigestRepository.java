package com.verita.contentservice.repository;

import com.verita.contentservice.entity.DigestEntity;
import com.verita.contentservice.entity.DigestTypeValue;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DigestRepository extends JpaRepository<DigestEntity, UUID> {

    /**
     * The caller's digest history: their PERSONAL digests plus any PUBLIC digests assigned to them
     * on zero-subscription days (ADR-0019), newest first.
     */
    @Query("""
            SELECT d FROM DigestEntity d
            WHERE (d.digestType = com.verita.contentservice.entity.DigestTypeValue.PERSONAL
                   AND d.targetUserId = :userId)
               OR d.id IN (SELECT a.digestId FROM DigestAssignmentEntity a WHERE a.id.userId = :userId)
            ORDER BY d.digestDate DESC, d.createdAt DESC
            """)
    Page<DigestEntity> findHistoryForUser(@Param("userId") UUID userId, Pageable pageable);

    Optional<DigestEntity> findFirstByDigestTypeOrderByDigestDateDescCreatedAtDesc(DigestTypeValue digestType);

    Optional<DigestEntity> findFirstByDigestTypeAndDigestDateOrderByCreatedAtDesc(
            DigestTypeValue digestType, LocalDate digestDate);

    Optional<DigestEntity> findFirstByDigestTypeAndTargetUserIdAndDigestDateOrderByCreatedAtDesc(
            DigestTypeValue digestType, UUID targetUserId, LocalDate digestDate);

    void deleteByDigestTypeAndTargetUserIdAndDigestDate(
            DigestTypeValue digestType, UUID targetUserId, LocalDate digestDate);
}
