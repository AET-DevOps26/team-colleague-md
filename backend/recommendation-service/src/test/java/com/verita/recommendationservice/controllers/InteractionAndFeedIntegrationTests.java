package com.verita.recommendationservice.controllers;

import com.github.benmanes.caffeine.cache.Cache;
import com.verita.recommendationservice.entities.Interaction;
import com.verita.recommendationservice.repository.InteractionRepository;
import com.verita.recommendationservice.service.InteractionBuffer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for the item-7 features: interaction tracking
 * (validation/auth/rate-limit), the batched interaction-write buffer, and trending-feed
 * caching. Runs the full Spring context against a real PostgreSQL via Testcontainers, with
 * Flyway building the schema — matching how the service runs in production.
 */
@SpringBootTest
@Testcontainers
@Import(InteractionAndFeedIntegrationTests.TestSecurityBeans.class)
class InteractionAndFeedIntegrationTests {

    @Container
    static final PostgreSQLContainer<?> db = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("verita_recommendations_test")
            .withUsername("verita_user")
            .withPassword("verita_password");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", db::getJdbcUrl);
        registry.add("spring.datasource.username", db::getUsername);
        registry.add("spring.datasource.password", db::getPassword);
        registry.add("spring.datasource.driver-class-name", db::getDriverClassName);
        // Resource-server config needs a concrete issuer to bind; the decoder is stubbed below
        // and never invoked because the jwt() post-processor injects the authentication directly.
        registry.add("spring.security.oauth2.resourceserver.jwt.issuer-uri", () -> "https://issuer.test.local");
        // Tiny bucket so the rate-limit test can deterministically exhaust it.
        registry.add("recommendation.rate-limit.interactions.capacity", () -> "2");
        registry.add("recommendation.rate-limit.interactions.refill-per-second", () -> "0.0001");
        // Disable the scheduled auto-flush so the buffer test fully controls when flushing happens.
        registry.add("recommendation.interactions.buffer.flush-interval-ms", () -> "3600000");
    }

    @TestConfiguration
    static class TestSecurityBeans {
        @Bean
        JwtDecoder jwtDecoder() {
            return token -> {
                throw new UnsupportedOperationException("JwtDecoder is not exercised in tests");
            };
        }
    }

    private MockMvc mockMvc;

    @Autowired private WebApplicationContext context;
    @Autowired private InteractionRepository interactionRepository;
    @Autowired private InteractionBuffer interactionBuffer;
    @Autowired private CacheManager cacheManager;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void trackInteraction_withValidRequest_returns202() throws Exception {
        String body = """
                { "postId": "%s", "interactionType": "CLICK" }
                """.formatted(UUID.randomUUID());

        mockMvc.perform(post("/api/v1/interactions/track")
                        .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isAccepted());
    }

    @Test
    void trackInteraction_withoutAuthentication_returns401() throws Exception {
        String body = """
                { "postId": "%s", "interactionType": "CLICK" }
                """.formatted(UUID.randomUUID());

        mockMvc.perform(post("/api/v1/interactions/track")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void trackInteraction_withScrollDepthOutOfRange_returns400() throws Exception {
        String body = """
                { "postId": "%s", "interactionType": "SCROLL", "scrollDepth": 150 }
                """.formatted(UUID.randomUUID());

        mockMvc.perform(post("/api/v1/interactions/track")
                        .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void trackInteraction_whenRateLimitExceeded_returns429() throws Exception {
        String subject = UUID.randomUUID().toString();
        String body = """
                { "postId": "%s", "interactionType": "VIEW" }
                """.formatted(UUID.randomUUID());

        // Bucket capacity is 2 → the first two requests are accepted.
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/interactions/track")
                            .with(jwt().jwt(j -> j.subject(subject)))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isAccepted());
        }

        // The third request from the same user is throttled.
        mockMvc.perform(post("/api/v1/interactions/track")
                        .with(jwt().jwt(j -> j.subject(subject)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429));
    }

    @Test
    void bufferedInteractions_arePersistedAsBatchOnFlush() {
        UUID userId = UUID.randomUUID();
        Interaction interaction = new Interaction();
        interaction.setUserId(userId);
        interaction.setPostId(UUID.randomUUID());
        interaction.setInteractionType("DWELL");
        interaction.setDurationSeconds(42);

        interactionBuffer.add(interaction);
        assertTrue(interactionRepository.findByUserId(userId).isEmpty(),
                "interaction should remain buffered until flush");

        interactionBuffer.flush();

        List<Interaction> persisted = interactionRepository.findByUserId(userId);
        assertEquals(1, persisted.size());
        assertEquals(42, persisted.get(0).getDurationSeconds());
        assertEquals("DWELL", persisted.get(0).getInteractionType());
    }

    @Test
    void trendingFeed_responseIsCached() throws Exception {
        var cache = cacheManager.getCache("trendingFeed");
        cache.clear();

        mockMvc.perform(get("/api/v1/feed/trending")
                        .param("tag", "LLMs").param("cursor", "c1").param("size", "10"))
                .andExpect(status().isOk());

        @SuppressWarnings("unchecked")
        Cache<Object, Object> nativeCache = (Cache<Object, Object>) cache.getNativeCache();
        nativeCache.cleanUp();
        assertEquals(1, nativeCache.estimatedSize());

        // An identical request is served from the cache — no second entry is created.
        mockMvc.perform(get("/api/v1/feed/trending")
                        .param("tag", "LLMs").param("cursor", "c1").param("size", "10"))
                .andExpect(status().isOk());
        nativeCache.cleanUp();
        assertEquals(1, nativeCache.estimatedSize());
    }
}
