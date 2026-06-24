package com.verita.recommendationservice.service;

import com.verita.recommendationservice.entity.TopicSubscription;
import com.verita.recommendationservice.entity.UserSubscription;
import com.verita.recommendationservice.repository.TopicSubscriptionRepository;
import com.verita.recommendationservice.repository.UserSubscriptionRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SubscriptionServiceTest {

    @Mock private TopicSubscriptionRepository topicSubscriptionRepository;
    @Mock private UserSubscriptionRepository userSubscriptionRepository;
    @InjectMocks private SubscriptionService subscriptionService;

    private final UUID userId = UUID.randomUUID();
    private final UUID topicId = UUID.randomUUID();
    private final UUID followedId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void subscribeToTopic_new_savesAndReturnsTrue() {
        when(topicSubscriptionRepository.existsByUserIdAndTopicId(userId, topicId)).thenReturn(false);
        assertTrue(subscriptionService.subscribeToTopic(userId, topicId));
        verify(topicSubscriptionRepository).save(any(TopicSubscription.class));
    }

    @Test
    void subscribeToTopic_existing_returnsFalseWithoutSaving() {
        when(topicSubscriptionRepository.existsByUserIdAndTopicId(userId, topicId)).thenReturn(true);
        assertFalse(subscriptionService.subscribeToTopic(userId, topicId));
        verify(topicSubscriptionRepository, never()).save(any());
    }

    @Test
    void subscribeToTopic_concurrentDuplicate_returnsFalse() {
        when(topicSubscriptionRepository.existsByUserIdAndTopicId(userId, topicId)).thenReturn(false);
        when(topicSubscriptionRepository.save(any())).thenThrow(new DataIntegrityViolationException("dup"));
        assertFalse(subscriptionService.subscribeToTopic(userId, topicId));
    }

    @Test
    void unsubscribeFromTopic_found_deletes() {
        TopicSubscription sub = new TopicSubscription();
        when(topicSubscriptionRepository.findByUserIdAndTopicId(userId, topicId)).thenReturn(Optional.of(sub));
        subscriptionService.unsubscribeFromTopic(userId, topicId);
        verify(topicSubscriptionRepository).delete(sub);
    }

    @Test
    void unsubscribeFromTopic_missing_throws404() {
        when(topicSubscriptionRepository.findByUserIdAndTopicId(userId, topicId)).thenReturn(Optional.empty());
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> subscriptionService.unsubscribeFromTopic(userId, topicId));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void subscribeToUser_self_throws400() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> subscriptionService.subscribeToUser(userId, userId));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void subscribeToUser_new_saves() {
        when(userSubscriptionRepository.existsByFollowerIdAndFollowedId(userId, followedId)).thenReturn(false);
        subscriptionService.subscribeToUser(userId, followedId);
        verify(userSubscriptionRepository).save(any(UserSubscription.class));
    }

    @Test
    void subscribeToUser_existing_noop() {
        when(userSubscriptionRepository.existsByFollowerIdAndFollowedId(userId, followedId)).thenReturn(true);
        subscriptionService.subscribeToUser(userId, followedId);
        verify(userSubscriptionRepository, never()).save(any());
    }

    @Test
    void unsubscribeFromUser_missing_throws404() {
        when(userSubscriptionRepository.findByFollowerIdAndFollowedId(userId, followedId)).thenReturn(Optional.empty());
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> subscriptionService.unsubscribeFromUser(userId, followedId));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void getSubscribedTopics_delegatesToRepository() {
        when(topicSubscriptionRepository.findByUserId(userId)).thenReturn(java.util.List.of());
        assertTrue(subscriptionService.getSubscribedTopics(userId).isEmpty());
    }
}
