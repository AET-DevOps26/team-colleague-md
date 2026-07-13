package com.verita.contentservice.repository;

import com.verita.contentservice.entity.DigestGenerationJobEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DigestGenerationJobRepository extends JpaRepository<DigestGenerationJobEntity, UUID> {
}
