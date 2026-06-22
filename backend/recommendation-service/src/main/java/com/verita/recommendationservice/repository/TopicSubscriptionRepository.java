package com.verita.recommendationservice.repository;

import com.verita.recommendationservice.entities.TopicSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TopicSubscriptionRepository extends JpaRepository<TopicSubscription, UUID> {

    List<TopicSubscription> findByUserId(UUID userId);

    Optional<TopicSubscription> findByUserIdAndTopicId(UUID userId, UUID topicId);

    boolean existsByUserIdAndTopicId(UUID userId, UUID topicId);
}
