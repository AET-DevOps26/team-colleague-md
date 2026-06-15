package com.verita.recommendationservice.repository;

import com.verita.recommendationservice.entities.UserSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, UUID> {

    List<UserSubscription> findByFollowerId(UUID followerId);

    boolean existsByFollowerIdAndFollowedId(UUID followerId, UUID followedId);
}
