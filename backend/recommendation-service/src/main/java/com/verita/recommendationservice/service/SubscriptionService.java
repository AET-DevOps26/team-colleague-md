package com.verita.recommendationservice.service;

import com.verita.recommendationservice.entities.TopicSubscription;
import com.verita.recommendationservice.entities.UserSubscription;
import com.verita.recommendationservice.repository.TopicSubscriptionRepository;
import com.verita.recommendationservice.repository.UserSubscriptionRepository;
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
        if (!topicSubscriptionRepository.existsByUserIdAndTopicId(userId, topicId)) {
            TopicSubscription sub = new TopicSubscription();
            sub.setUserId(userId);
            sub.setTopicId(topicId);
            topicSubscriptionRepository.save(sub);
        }
    }

    public void unsubscribeFromTopic(UUID topicId, UUID userId) {
        TopicSubscription sub = topicSubscriptionRepository.findByUserIdAndTopicId(userId, topicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Topic subscription not found"));
        topicSubscriptionRepository.delete(sub);
    }

    public void subscribeToUser(UUID followerId, UUID followedId) {
        if (!userSubscriptionRepository.existsByFollowerIdAndFollowedId(followerId, followedId)) {
            UserSubscription sub = new UserSubscription();
            sub.setFollowerId(followerId);
            sub.setFollowedId(followedId);
            userSubscriptionRepository.save(sub);
        }
    }

    public void unsubscribeFromUser(UUID followedId, UUID followerId) {
        UserSubscription sub = userSubscriptionRepository.findByFollowerIdAndFollowedId(followerId, followedId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User subscription not found"));
        userSubscriptionRepository.delete(sub);
    }
}
