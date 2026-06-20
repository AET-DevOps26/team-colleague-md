package com.verita.recommendationservice.controller;

import com.github.benmanes.caffeine.cache.Cache;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.verita.recommendationservice.entity.Interaction;
import com.verita.recommendationservice.repository.InteractionRepository;
import com.verita.recommendationservice.service.InteractionBuffer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
class InteractionAndFeedIntegrationTests {

    // 64-byte secret: HS256 (MACSigner) requires at least a 256-bit key.
    private static final String JWT_SECRET = "0123456789012345678901234567890123456789012345678901234567890123";

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
        // Real shared secret: tokens are minted with the same value and verified by the
        // production NimbusJwtDecoder through the full filter chain (no stubbed decoder).
        registry.add("app.jwt-secret", () -> JWT_SECRET);
        // Tiny bucket so the rate-limit test can deterministically exhaust it.
        registry.add("recommendation.rate-limit.interactions.capacity", () -> "2");
        registry.add("recommendation.rate-limit.interactions.refill-per-second", () -> "0.0001");
        // Disable the scheduled auto-flush so the buffer test fully controls when flushing happens.
        registry.add("recommendation.interactions.buffer.flush-interval-ms", () -> "3600000");
    }

    /** Mints a real HS256 token signed with the shared test secret: {@code sub}=username, {@code userId}=UUID. */
    private static String mintToken(UUID userId) {
        return mintToken(userId.toString(), "user-" + userId);
    }

    private static String mintToken(String userIdClaim, String username) {
        try {
            JWSSigner signer = new MACSigner(JWT_SECRET.getBytes(StandardCharsets.UTF_8));
            JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
                    .subject(username)
                    .issueTime(new Date())
                    .expirationTime(new Date(System.currentTimeMillis() + 3_600_000));
            if (userIdClaim != null) {
                claims.claim("userId", userIdClaim);
            }
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims.build());
            jwt.sign(signer);
            return "Bearer " + jwt.serialize();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to mint test token", e);
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
                        .header("Authorization", mintToken(UUID.randomUUID()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isAccepted());
    }

    @Test
    void trackInteraction_withRealSharedSecretToken_resolvesUserIdClaim() throws Exception {
        // Regression for #150: a real HS256 token signed with the shared secret must pass the
        // full filter chain + production NimbusJwtDecoder, and SecurityUtils must read the
        // 'userId' claim (not parse the username 'sub' as a UUID).
        UUID userId = UUID.randomUUID();
        String body = """
                { "postId": "%s", "interactionType": "CLICK" }
                """.formatted(UUID.randomUUID());

        mockMvc.perform(post("/api/v1/interactions/track")
                        .header("Authorization", mintToken(userId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isAccepted());

        interactionBuffer.flush();
        List<Interaction> persisted = interactionRepository.findByUserId(userId);
        assertEquals(1, persisted.size());
        assertEquals(userId, persisted.get(0).getUserId());
    }

    @Test
    void trackInteraction_withTokenMissingUserIdClaim_returns401() throws Exception {
        // A validly-signed token that lacks the 'userId' claim must be rejected at
        // authentication time with 401 — not 500 deeper in the request.
        String body = """
                { "postId": "%s", "interactionType": "CLICK" }
                """.formatted(UUID.randomUUID());

        mockMvc.perform(post("/api/v1/interactions/track")
                        .header("Authorization", mintToken(null, "alice"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
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
                        .header("Authorization", mintToken(UUID.randomUUID()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void trackInteraction_whenRateLimitExceeded_returns429() throws Exception {
        // Same user across requests → one token reused so the per-user bucket is shared.
        String token = mintToken(UUID.randomUUID());
        String body = """
                { "postId": "%s", "interactionType": "VIEW" }
                """.formatted(UUID.randomUUID());

        // Bucket capacity is 2 → the first two requests are accepted.
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/interactions/track")
                            .header("Authorization", token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isAccepted());
        }

        // The third request from the same user is throttled.
        mockMvc.perform(post("/api/v1/interactions/track")
                        .header("Authorization", token)
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
                        .param("topic", "LLMs").param("cursor", "c1").param("size", "10"))
                .andExpect(status().isOk());

        @SuppressWarnings("unchecked")
        Cache<Object, Object> nativeCache = (Cache<Object, Object>) cache.getNativeCache();
        nativeCache.cleanUp();
        assertEquals(1, nativeCache.estimatedSize());

        // An identical request is served from the cache — no second entry is created.
        mockMvc.perform(get("/api/v1/feed/trending")
                        .param("topic", "LLMs").param("cursor", "c1").param("size", "10"))
                .andExpect(status().isOk());
        nativeCache.cleanUp();
        assertEquals(1, nativeCache.estimatedSize());
    }
}
