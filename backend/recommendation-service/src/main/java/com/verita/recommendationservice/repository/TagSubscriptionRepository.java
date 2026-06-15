package com.verita.recommendationservice.repository;

import com.verita.recommendationservice.entities.TagSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TagSubscriptionRepository extends JpaRepository<TagSubscription, UUID> {

    List<TagSubscription> findByUserId(UUID userId);

    Optional<TagSubscription> findByUserIdAndTagId(UUID userId, UUID tagId);

    boolean existsByUserIdAndTagId(UUID userId, UUID tagId);
}
