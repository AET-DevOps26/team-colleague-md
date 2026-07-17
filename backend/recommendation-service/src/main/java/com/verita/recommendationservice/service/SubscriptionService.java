package com.verita.recommendationservice.service;

import com.verita.recommendationservice.entity.TopicSubscription;
import com.verita.recommendationservice.entity.UserSubscription;
import com.verita.recommendationservice.repository.TopicSubscriptionRepository;
import com.verita.recommendationservice.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

    /** Maximum topics a user may follow at once; the Manage Topics UI mirrors this cap. */
    static final int MAX_FOLLOWED_TOPICS = 10;

    private final TopicSubscriptionRepository topicSubscriptionRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;

    public List<TopicSubscription> getSubscribedTopics(UUID userId) {
        return topicSubscriptionRepository.findByUserId(userId);
    }

    /** Most-subscribed topic IDs platform-wide, most popular first (seeds the daily public digest). */
    public List<UUID> getTrendingTopicIds(int limit) {
        return topicSubscriptionRepository.findMostSubscribedTopicIds(
                org.springframework.data.domain.PageRequest.of(0, limit));
    }

    /**
     * Subscribes the user to the topic, idempotently.
     *
     * @return {@code true} if a new subscription was created, {@code false} if it already existed
     *         — the caller uses this to fire the follower-count delta only on a real change.
     */
    public boolean subscribeToTopic(UUID userId, UUID topicId) {
        if (topicSubscriptionRepository.existsByUserIdAndTopicId(userId, topicId)) {
            return false;
        }
        if (topicSubscriptionRepository.countByUserId(userId) >= MAX_FOLLOWED_TOPICS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "You can follow at most " + MAX_FOLLOWED_TOPICS + " topics");
        }
        TopicSubscription sub = new TopicSubscription();
        sub.setUserId(userId);
        sub.setTopicId(topicId);
        try {
            topicSubscriptionRepository.save(sub);
            return true;
        } catch (DataIntegrityViolationException ex) {
            // A concurrent request inserted the same (user_id, topic_id) between the
            // exists-check and this save. The unique constraint is the source of truth,
            // so a duplicate just means "already subscribed" — treat it as success (idempotent),
            // but report no new row so we don't double-count the follower delta.
            return false;
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
