package com.verita.recommendationservice.service;

import com.verita.recommendationservice.entities.TagSubscription;
import com.verita.recommendationservice.entities.UserSubscription;
import com.verita.recommendationservice.repository.TagSubscriptionRepository;
import com.verita.recommendationservice.repository.UserSubscriptionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class SubscriptionService {

    private final TagSubscriptionRepository tagSubscriptionRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;

    public SubscriptionService(TagSubscriptionRepository tagSubscriptionRepository,
                               UserSubscriptionRepository userSubscriptionRepository) {
        this.tagSubscriptionRepository = tagSubscriptionRepository;
        this.userSubscriptionRepository = userSubscriptionRepository;
    }

    public List<TagSubscription> getSubscribedTags(UUID userId) {
        return tagSubscriptionRepository.findByUserId(userId);
    }

    public void subscribeToTag(UUID userId, UUID tagId) {
        if (!tagSubscriptionRepository.existsByUserIdAndTagId(userId, tagId)) {
            TagSubscription sub = new TagSubscription();
            sub.setUserId(userId);
            sub.setTagId(tagId);
            tagSubscriptionRepository.save(sub);
        }
    }

    public void unsubscribeFromTag(UUID tagId, UUID userId) {
        TagSubscription sub = tagSubscriptionRepository.findByUserIdAndTagId(userId, tagId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tag subscription not found"));
        tagSubscriptionRepository.delete(sub);
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
