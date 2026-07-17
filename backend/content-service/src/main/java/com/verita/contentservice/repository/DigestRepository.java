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
     * Returns the caller's digest history with at most one eligible digest per day. When multiple
     * personal or assigned public digests exist for a day, the newest {@code created_at} wins; the
     * id provides a deterministic tie-breaker for equal timestamps.
     *
     * @param userId user whose personal and assigned public digests are visible
     * @param pageable requested history page
     * @return newest visible digest for each day, ordered by day descending
     */
    @Query(value = """
            SELECT DISTINCT ON (d.digest_date) d.*
            FROM digests d
            WHERE (d.digest_type = 'PERSONAL' AND d.target_user_id = :userId)
               OR d.id IN (SELECT a.digest_id FROM digest_assignments a WHERE a.user_id = :userId)
            ORDER BY d.digest_date DESC, d.created_at DESC, d.id DESC
            """,
            countQuery = """
                    SELECT COUNT(DISTINCT d.digest_date)
                    FROM digests d
                    WHERE (d.digest_type = 'PERSONAL' AND d.target_user_id = :userId)
                       OR d.id IN (SELECT a.digest_id FROM digest_assignments a WHERE a.user_id = :userId)
                    """,
            nativeQuery = true)
    Page<DigestEntity> findHistoryForUser(@Param("userId") UUID userId, Pageable pageable);

    Optional<DigestEntity> findFirstByDigestTypeOrderByDigestDateDescCreatedAtDesc(DigestTypeValue digestType);

    Optional<DigestEntity> findFirstByDigestTypeAndDigestDateOrderByCreatedAtDesc(
            DigestTypeValue digestType, LocalDate digestDate);

    Optional<DigestEntity> findFirstByDigestTypeAndTargetUserIdAndDigestDateOrderByCreatedAtDesc(
            DigestTypeValue digestType, UUID targetUserId, LocalDate digestDate);

    void deleteByDigestTypeAndTargetUserIdAndDigestDate(
            DigestTypeValue digestType, UUID targetUserId, LocalDate digestDate);
}
