package com.verita.recommendationservice.controller;

import com.verita.recommendationservice.filter.InternalAuthFilter;
import com.verita.recommendationservice.entity.Interaction;
import com.verita.recommendationservice.entity.Notification;
import com.verita.recommendationservice.entity.TopicSubscription;
import com.verita.recommendationservice.entity.UserSubscription;
import com.verita.recommendationservice.repository.InteractionRepository;
import com.verita.recommendationservice.repository.NotificationRepository;
import com.verita.recommendationservice.repository.TopicSubscriptionRepository;
import com.verita.recommendationservice.repository.UserSubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Testcontainers
class UserRecommendationCleanupIntegrationTests {

    private static final String INTERNAL_TOKEN = "test-internal-token";

    @Container
    static final PostgreSQLContainer<?> db = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("verita_recommendations_cleanup_test")
            .withUsername("verita_user")
            .withPassword("verita_password");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", db::getJdbcUrl);
        registry.add("spring.datasource.username", db::getUsername);
        registry.add("spring.datasource.password", db::getPassword);
        registry.add("spring.datasource.driver-class-name", db::getDriverClassName);
        // Shared HS256 secret for SecurityConfig's NimbusJwtDecoder bean to bind; no token is
        // decoded here — the endpoint is permitAll and gated by the internal-service token.
        registry.add("app.jwt-secret", () -> "0123456789012345678901234567890123456789012345678901234567890123");
        registry.add("app.internal-service-token", () -> INTERNAL_TOKEN);
    }

    private MockMvc mockMvc;

    @Autowired private WebApplicationContext context;
    @Autowired private TopicSubscriptionRepository topicSubscriptionRepository;
    @Autowired private UserSubscriptionRepository userSubscriptionRepository;
    @Autowired private InteractionRepository interactionRepository;
    @Autowired private NotificationRepository notificationRepository;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        interactionRepository.deleteAll();
        notificationRepository.deleteAll();
        topicSubscriptionRepository.deleteAll();
        userSubscriptionRepository.deleteAll();
    }

    @Test
    void deleteUserRecommendationDataCleansOwnedRowsAndIsIdempotent() throws Exception {
        UUID deletedUserId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        UUID thirdUserId = UUID.randomUUID();

        TopicSubscription deletedTopicSubscription = new TopicSubscription();
        deletedTopicSubscription.setUserId(deletedUserId);
        deletedTopicSubscription.setTopicId(UUID.randomUUID());
        topicSubscriptionRepository.save(deletedTopicSubscription);

        TopicSubscription otherTopicSubscription = new TopicSubscription();
        otherTopicSubscription.setUserId(otherUserId);
        otherTopicSubscription.setTopicId(UUID.randomUUID());
        topicSubscriptionRepository.save(otherTopicSubscription);

        UserSubscription deletedUserFollowing = new UserSubscription();
        deletedUserFollowing.setFollowerId(deletedUserId);
        deletedUserFollowing.setFollowedId(otherUserId);
        userSubscriptionRepository.save(deletedUserFollowing);

        UserSubscription deletedUserFollowed = new UserSubscription();
        deletedUserFollowed.setFollowerId(otherUserId);
        deletedUserFollowed.setFollowedId(deletedUserId);
        userSubscriptionRepository.save(deletedUserFollowed);

        UserSubscription unrelatedUserSubscription = new UserSubscription();
        unrelatedUserSubscription.setFollowerId(otherUserId);
        unrelatedUserSubscription.setFollowedId(thirdUserId);
        userSubscriptionRepository.save(unrelatedUserSubscription);

        Interaction deletedUserInteraction = new Interaction();
        deletedUserInteraction.setUserId(deletedUserId);
        deletedUserInteraction.setPostId(UUID.randomUUID());
        deletedUserInteraction.setInteractionType("VIEW");
        interactionRepository.save(deletedUserInteraction);

        Interaction otherUserInteraction = new Interaction();
        otherUserInteraction.setUserId(otherUserId);
        otherUserInteraction.setPostId(UUID.randomUUID());
        otherUserInteraction.setInteractionType("CLICK");
        interactionRepository.save(otherUserInteraction);

        Notification deletedUserNotification = new Notification();
        deletedUserNotification.setUserId(deletedUserId);
        deletedUserNotification.setType("COMMENT");
        deletedUserNotification.setContent("Deleted user's notification");
        notificationRepository.save(deletedUserNotification);

        Notification otherUserNotification = new Notification();
        otherUserNotification.setUserId(otherUserId);
        otherUserNotification.setType("LIKE");
        otherUserNotification.setContent("Other user's notification");
        notificationRepository.save(otherUserNotification);

        mockMvc.perform(delete("/internal/v1/users/{userId}/data", deletedUserId)
                        .header(InternalAuthFilter.HEADER, INTERNAL_TOKEN))
                .andExpect(status().isNoContent());

        assertTrue(topicSubscriptionRepository.findByUserId(deletedUserId).isEmpty());
        assertTrue(userSubscriptionRepository.findByFollowerId(deletedUserId).isEmpty());
        assertTrue(userSubscriptionRepository.findByFollowedId(deletedUserId).isEmpty());
        assertTrue(interactionRepository.findByUserId(deletedUserId).isEmpty());
        assertTrue(notificationRepository.findByUserId(deletedUserId, Pageable.unpaged()).isEmpty());

        assertFalse(topicSubscriptionRepository.findByUserId(otherUserId).isEmpty());
        assertTrue(userSubscriptionRepository
                .existsByFollowerIdAndFollowedId(otherUserId, thirdUserId));
        assertFalse(interactionRepository.findByUserId(otherUserId).isEmpty());
        assertFalse(notificationRepository.findByUserId(otherUserId, Pageable.unpaged()).isEmpty());

        mockMvc.perform(delete("/internal/v1/users/{userId}/data", deletedUserId)
                        .header(InternalAuthFilter.HEADER, INTERNAL_TOKEN))
                .andExpect(status().isNoContent());
    }
}
