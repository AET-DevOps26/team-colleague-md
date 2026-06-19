package com.verita.contentservice.integration;

import com.jayway.jsonpath.JsonPath;
import com.verita.contentservice.TestcontainersConfiguration;
import com.verita.contentservice.dto.GenAiSummarizeResponse;
import com.verita.contentservice.dto.UserProfileDto;
import com.verita.contentservice.support.Clients;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
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

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end test through the real security chain, controller, services and a PostgreSQL
 * database. The external user/genai service ({@link Clients}) is mocked so the test is
 * hermetic; authentication uses a JWT signed with the test {@code app.jwt-secret}, so the
 * real {@code SecuritySupport.JwtFilter} accepts it. Runs only when Docker is available.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class ContentFlowIT {

    @Autowired private WebApplicationContext context;

    @MockitoBean private Clients clients;

    @Value("${app.jwt-secret}")
    private String jwtSecret;

    private MockMvc mockMvc;
    private String bearer;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();

        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        bearer = "Bearer " + Jwts.builder().subject("alice").signWith(key).compact();

        UserProfileDto profile = new UserProfileDto(userId, "alice", "Alice", null, "USER", null);
        when(clients.getCurrentUser(anyString())).thenReturn(profile);
        when(clients.getUserById(any())).thenReturn(profile);
        when(clients.getUsersByIds(any())).thenReturn(Map.of(userId, profile));
        when(clients.summarize(any(), any(), any(), any()))
                .thenReturn(new GenAiSummarizeResponse(UUID.randomUUID().toString(), List.of("summary"), "model", null));
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
}
