package com.verita.recommendationservice.service;

import com.verita.recommendationservice.repository.InteractionRepository;
import com.verita.recommendationservice.repository.NotificationRepository;
import com.verita.recommendationservice.repository.TopicSubscriptionRepository;
import com.verita.recommendationservice.repository.UserSubscriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserRecommendationCleanupService {
    private final TopicSubscriptionRepository topicSubscriptionRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final InteractionRepository interactionRepository;
    private final NotificationRepository notificationRepository;

    public UserRecommendationCleanupService(TopicSubscriptionRepository topicSubscriptionRepository,
                                            UserSubscriptionRepository userSubscriptionRepository,
                                            InteractionRepository interactionRepository,
                                            NotificationRepository notificationRepository) {
        this.topicSubscriptionRepository = topicSubscriptionRepository;
        this.userSubscriptionRepository = userSubscriptionRepository;
        this.interactionRepository = interactionRepository;
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public void deleteUserData(UUID userId) {
        topicSubscriptionRepository.deleteByUserId(userId);
        userSubscriptionRepository.deleteByFollowerId(userId);
        userSubscriptionRepository.deleteByFollowedId(userId);
        interactionRepository.deleteByUserId(userId);
        notificationRepository.deleteByUserId(userId);
    }
}
