package com.verita.recommendationservice.repository;

import com.verita.recommendationservice.entities.TagSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TagSubscriptionRepository extends JpaRepository<TagSubscription, UUID> {

    List<TagSubscription> findByUserId(UUID userId);

    boolean existsByUserIdAndTagId(UUID userId, UUID tagId);
}
