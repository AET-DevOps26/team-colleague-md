package com.verita.recommendationservice.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.verita.recommendationservice.entity.TopicSubscription;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TopicSubscriptionRepository extends JpaRepository<TopicSubscription, UUID> {

    List<TopicSubscription> findByUserId(UUID userId);

    /** Most-subscribed topic IDs across the platform, most popular first (seeds the public digest). */
    @Query("SELECT ts.topicId FROM TopicSubscription ts GROUP BY ts.topicId ORDER BY COUNT(ts) DESC")
    List<UUID> findMostSubscribedTopicIds(Pageable pageable);

    Optional<TopicSubscription> findByUserIdAndTopicId(UUID userId, UUID topicId);

    boolean existsByUserIdAndTopicId(UUID userId, UUID topicId);

    long countByUserId(UUID userId);

    void deleteByUserId(UUID userId);
}
