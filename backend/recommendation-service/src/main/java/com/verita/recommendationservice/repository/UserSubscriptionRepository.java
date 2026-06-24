package com.verita.recommendationservice.repository;

import com.verita.recommendationservice.entities.UserSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, UUID> {

    List<UserSubscription> findByFollowerId(UUID followerId);

    List<UserSubscription> findByFollowedId(UUID followedId);

    Optional<UserSubscription> findByFollowerIdAndFollowedId(UUID followerId, UUID followedId);

    boolean existsByFollowerIdAndFollowedId(UUID followerId, UUID followedId);

    void deleteByFollowerId(UUID followerId);

    void deleteByFollowedId(UUID followedId);
}
