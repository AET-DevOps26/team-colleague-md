package com.verita.contentservice.controller;

import com.verita.contentservice.TestcontainersConfiguration;
import com.verita.contentservice.service.PostService;
import com.verita.model.PostPage;
import com.verita.model.PostResponse;
import com.verita.model.PostSummaryResponse;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
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
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer test for PostController: request mapping, status codes, and bean-validation → 400
 * mapping via GlobalExceptionHandler. MockMvc is built straight from the context without
 * {@code springSecurity()}, so the security filter chain is bypassed and the handler logic is
 * exercised in isolation — the full security chain is covered by ContentFlowIT (ADR-0009).
 *
 * <p>Spring Boot 4.0.6 removed the {@code ...autoconfigure.web.servlet} slice (no {@code @WebMvcTest}
 * / {@code @AutoConfigureMockMvc}), so this follows the project standard: {@code @SpringBootTest}
 * over Testcontainers Postgres with MockMvc assembled by hand.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class PostControllerTest {

    @Autowired private WebApplicationContext context;
    @MockitoBean private PostService postService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
    }

    @Test
    void createPost_validBody_returns201() throws Exception {
        when(postService.createPost(any())).thenReturn(new PostResponse().id(UUID.randomUUID()));
        mockMvc.perform(post("/api/v1/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"A valid title\",\"content\":\"Body content\"}"))
                .andExpect(status().isCreated());
        verify(postService).createPost(any());
    }

    @Test
    void createPost_titleTooShort_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"x\",\"content\":\"Body content\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getPostById_returns200() throws Exception {
        when(postService.getPost(any())).thenReturn(new PostResponse().id(UUID.randomUUID()));
        mockMvc.perform(get("/api/v1/posts/{id}", UUID.randomUUID()))
                .andExpect(status().isOk());
    }

    @Test
    void getPostSummary_returns200() throws Exception {
        when(postService.getPostSummary(any())).thenReturn(new PostSummaryResponse());
        mockMvc.perform(get("/api/v1/posts/{id}/summary", UUID.randomUUID()))
                .andExpect(status().isOk());
    }

    @Test
    void getAllPosts_publicNoToken_returns200() throws Exception {
        when(postService.getAllPosts(anyInt(), anyInt(), any())).thenReturn(new PostPage());
        mockMvc.perform(get("/api/v1/posts"))
                .andExpect(status().isOk());
    }

    @Test
    void deletePost_returns204() throws Exception {
        mockMvc.perform(delete("/api/v1/posts/{id}", UUID.randomUUID()))
                .andExpect(status().isNoContent());
        verify(postService).deletePost(any());
    }
}
