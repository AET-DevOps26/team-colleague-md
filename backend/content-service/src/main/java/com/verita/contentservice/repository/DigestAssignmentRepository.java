package com.verita.contentservice.repository;

import com.verita.contentservice.entity.DigestAssignmentEntity;
import com.verita.contentservice.entity.DigestAssignmentId;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DigestAssignmentRepository
        extends JpaRepository<DigestAssignmentEntity, DigestAssignmentId> {

    Optional<DigestAssignmentEntity> findByIdUserIdAndIdDigestDate(UUID userId, LocalDate digestDate);
}
