package com.verita.contentservice.integration;

import com.jayway.jsonpath.JsonPath;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.verita.contentservice.TestcontainersConfiguration;
import com.verita.contentservice.client.GenAiClient;
import com.verita.contentservice.client.UserClient;
import com.verita.contentservice.filter.InternalAuthFilter;
import com.verita.contentservice.dto.GenAiSummarizeResponse;
import com.verita.contentservice.dto.UserProfileDto;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end test through the real security chain, controllers, services and a PostgreSQL database.
 * The upstream user/genai clients are mocked so the test is hermetic; authentication uses a JWT
 * signed with the test {@code app.jwt-secret} and carrying the {@code userId} claim, so the real
 * {@code JwtAuthenticationFilter} accepts it (ADR-0006). Runs only when Docker is available.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class ContentFlowIT {

    @Autowired private WebApplicationContext context;

    @MockitoBean private UserClient userClient;
    @MockitoBean private GenAiClient genAiClient;

    @Value("${app.jwt-secret}")
    private String jwtSecret;

    @Value("${app.internal-service-token}")
    private String internalServiceToken;

    private MockMvc mockMvc;
    private String bearer;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() throws Exception {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        bearer = "Bearer " + mintToken(userId, "alice");

        UserProfileDto profile = new UserProfileDto(userId, "alice", "Alice", null, "USER", null);
        when(userClient.getUserById(any())).thenReturn(profile);
        when(userClient.getUsersByIds(any())).thenReturn(Map.of(userId, profile));
        when(genAiClient.summarize(any(), any(), any()))
                .thenReturn(new GenAiSummarizeResponse(UUID.randomUUID().toString(), List.of("summary"), "model", null));
    }

    private String mintToken(UUID userId, String username) throws Exception {
        JWSSigner signer = new MACSigner(jwtSecret.getBytes(StandardCharsets.UTF_8));
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(username)
                .claim("userId", userId.toString())
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 3_600_000))
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(signer);
        return jwt.serialize();
    }

    @Test
    void fullPostLifecycle_createGetCommentLikeBookmark() throws Exception {
        String created = mockMvc.perform(post("/api/v1/posts")
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Integration title\",\"content\":\"Integration content here\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        UUID postId = UUID.fromString(JsonPath.read(created, "$.id"));

        mockMvc.perform(get("/api/v1/posts/{id}", postId).header("Authorization", bearer))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/posts/{id}/comments", postId)
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Great write-up\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/posts/{id}/like", postId)
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"LIKE\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/posts/{id}/bookmark", postId).header("Authorization", bearer))
                .andExpect(status().isNoContent());
    }

    @Test
    void createPost_withoutToken_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"No auth title\",\"content\":\"No auth content\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getAllPosts_isPublic_returns200WithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/posts"))
                .andExpect(status().isOk());
    }

    @Test
    void getMyDigests_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/digests"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getMyDigests_returnsOnlyCallersPersonalDigests() throws Exception {
        // A PERSONAL digest for the caller and one for someone else (ADR-0019).
        createPersonalDigest("Your daily briefing", userId);
        createPersonalDigest("Someone else's briefing", UUID.randomUUID());
        // A PUBLIC digest exists but is not assigned to the caller, so it must not surface.
        createPublicDigest("Community briefing");

        mockMvc.perform(get("/api/v1/digests").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Your daily briefing"))
                .andExpect(jsonPath("$.content[0].digestType").value("PERSONAL"));
    }

    @Test
    void getPublicTodayDigest_isReadableWithoutToken() throws Exception {
        createPublicDigest("Community briefing");

        mockMvc.perform(get("/api/v1/digests/public/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.digestType").value("PUBLIC"))
                .andExpect(jsonPath("$.title").value("Community briefing"));
    }

    private void createPersonalDigest(String title, UUID targetUserId) throws Exception {
        String body = "{\"digestType\":\"PERSONAL\",\"targetUserId\":\"" + targetUserId + "\","
                + "\"digestDate\":\"2026-07-04\",\"title\":\"" + title + "\","
                + "\"events\":[{\"headline\":\"Headline\",\"summaryBullets\":[\"A bullet\"],"
                + "\"topicIds\":[],\"sources\":[{\"url\":\"https://example.com/a\"}]}]}";
        mockMvc.perform(post("/internal/v1/digests")
                        .header(InternalAuthFilter.HEADER, internalServiceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }

    private void createPublicDigest(String title) throws Exception {
        String body = "{\"digestType\":\"PUBLIC\",\"digestDate\":\"2026-07-04\",\"title\":\"" + title + "\","
                + "\"events\":[{\"headline\":\"Headline\",\"summaryBullets\":[\"A bullet\"],"
                + "\"topicIds\":[],\"sources\":[{\"url\":\"https://example.com/a\"}]}]}";
        mockMvc.perform(post("/internal/v1/digests")
                        .header(InternalAuthFilter.HEADER, internalServiceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }
}
