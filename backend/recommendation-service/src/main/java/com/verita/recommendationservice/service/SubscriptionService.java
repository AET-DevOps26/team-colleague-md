package com.verita.recommendationservice.service;

import com.verita.recommendationservice.entities.TopicSubscription;
import com.verita.recommendationservice.entities.UserSubscription;
import com.verita.recommendationservice.repository.TopicSubscriptionRepository;
import com.verita.recommendationservice.repository.UserSubscriptionRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class SubscriptionService {

    private final TopicSubscriptionRepository topicSubscriptionRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;

    public SubscriptionService(TopicSubscriptionRepository topicSubscriptionRepository,
                               UserSubscriptionRepository userSubscriptionRepository) {
        this.topicSubscriptionRepository = topicSubscriptionRepository;
        this.userSubscriptionRepository = userSubscriptionRepository;
    }

    public List<TopicSubscription> getSubscribedTopics(UUID userId) {
        return topicSubscriptionRepository.findByUserId(userId);
    }

    public void subscribeToTopic(UUID userId, UUID topicId) {
        if (topicSubscriptionRepository.existsByUserIdAndTopicId(userId, topicId)) {
            return;
        }
        TopicSubscription sub = new TopicSubscription();
        sub.setUserId(userId);
        sub.setTopicId(topicId);
        try {
            topicSubscriptionRepository.save(sub);
        } catch (DataIntegrityViolationException ex) {
            // A concurrent request inserted the same (user_id, topic_id) between the
            // exists-check and this save. The unique constraint is the source of truth,
            // so a duplicate just means "already subscribed" — treat it as success (idempotent).
        }
    }

    public void unsubscribeFromTopic(UUID userId, UUID topicId) {
        TopicSubscription sub = topicSubscriptionRepository.findByUserIdAndTopicId(userId, topicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Topic subscription not found"));
        topicSubscriptionRepository.delete(sub);
    }

    public void subscribeToUser(UUID followerId, UUID followedId) {
        if (followerId.equals(followedId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot follow yourself");
        }
        if (userSubscriptionRepository.existsByFollowerIdAndFollowedId(followerId, followedId)) {
            return;
        }
        UserSubscription sub = new UserSubscription();
        sub.setFollowerId(followerId);
        sub.setFollowedId(followedId);
        try {
            userSubscriptionRepository.save(sub);
        } catch (DataIntegrityViolationException ex) {
            // Concurrent duplicate insert raced past the exists-check; the unique constraint
            // on (follower_id, followed_id) rejected it. Already following — treat as success.
        }
    }

    public void unsubscribeFromUser(UUID followerId, UUID followedId) {
        UserSubscription sub = userSubscriptionRepository.findByFollowerIdAndFollowedId(followerId, followedId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User subscription not found"));
        userSubscriptionRepository.delete(sub);
    }
}
