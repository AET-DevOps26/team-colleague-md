package com.verita.contentservice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.verita.contentservice.service.CommentService;
import com.verita.contentservice.service.InteractionService;
import com.verita.contentservice.service.PostService;
import com.verita.contentservice.service.TopicService;
import com.verita.contentservice.support.ErrorHandling;
import com.verita.model.CommentResponse;
import com.verita.model.LikeRequest;
import com.verita.model.PostLikeResponse;
import com.verita.model.PostPage;
import com.verita.model.PostResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer test: verifies routing, status codes, request validation, and that the controller
 * delegates to the service layer. Built with {@code standaloneSetup} so it needs no Spring
 * context or database — services are mocked and the real {@link ErrorHandling} advice maps
 * exceptions. (Spring Boot 4 moved {@code @WebMvcTest} out of the test-autoconfigure module;
 * standalone MockMvc gives an equivalent isolated slice with the same {@code MockMvcBuilders}
 * the user-service tests use. The security filter chain is exercised end-to-end in ContentFlowIT.)
 */
class ContentControllerTest {

    @Mock private PostService postService;
    @Mock private CommentService commentService;
    @Mock private InteractionService interactionService;
    @Mock private TopicService topicService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ObjectMapper objectMapper = new ObjectMapper()
                .registerModule(new JsonNullableModule())
                .registerModule(new JavaTimeModule());
        ContentController controller =
                new ContentController(postService, commentService, interactionService, topicService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ErrorHandling())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void createPost_validBody_returns201() throws Exception {
        PostResponse response = new PostResponse().id(UUID.randomUUID()).title("A valid title");
        when(postService.createPost(any(), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"A valid title\",\"content\":\"Hello world\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("A valid title"));
    }

    @Test
    void createPost_invalidBody_returns400() throws Exception {
        // title shorter than 5 chars and content missing -> bean validation rejects the body
        mockMvc.perform(post("/api/v1/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"ab\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getPostById_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(postService.getPost(eq(id), any())).thenReturn(new PostResponse().id(id).title("Hello"));

        mockMvc.perform(get("/api/v1/posts/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    @Test
    void deletePost_returns204_andDelegates() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(delete("/api/v1/posts/{id}", id))
                .andExpect(status().isNoContent());

        verify(postService).deletePost(eq(id), any());
    }

    @Test
    void likePost_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        when(interactionService.likePost(eq(id), eq(LikeRequest.TypeEnum.LIKE), any()))
                .thenReturn(new PostLikeResponse().likeCount(1).dislikeCount(0).isLikedByMe(true).isDislikedByMe(false));

        mockMvc.perform(post("/api/v1/posts/{id}/like", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"LIKE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likeCount").value(1));
    }

    @Test
    void bookmarkPost_returns204_andDelegates() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/posts/{id}/bookmark", id))
                .andExpect(status().isNoContent());

        verify(interactionService).bookmarkPost(eq(id), any());
    }

    @Test
    void createComment_validBody_returns201() throws Exception {
        UUID postId = UUID.randomUUID();
        when(commentService.addComment(eq(postId), any(), any()))
                .thenReturn(new CommentResponse().id(UUID.randomUUID()).text("Nice"));

        mockMvc.perform(post("/api/v1/posts/{id}/comments", postId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Nice\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.text").value("Nice"));
    }

    @Test
    void searchPosts_withQuery_delegatesAndReturns200() throws Exception {
        when(postService.searchPosts(eq("spring"), eq(0), eq(10), any()))
                .thenReturn(new PostPage().content(List.of()).page(0).size(10).totalPages(0).totalElements(0));

        mockMvc.perform(get("/api/v1/posts/search").param("q", "spring"))
                .andExpect(status().isOk());

        verify(postService).searchPosts(eq("spring"), eq(0), eq(10), any());
    }

    @Test
    void getAllPosts_appliesDefaultPaging() throws Exception {
        when(postService.getAllPosts(eq(0), eq(10), isNull(), any()))
                .thenReturn(new PostPage().content(List.of()).page(0).size(10).totalPages(0).totalElements(0));

        mockMvc.perform(get("/api/v1/posts"))
                .andExpect(status().isOk());

        verify(postService).getAllPosts(eq(0), eq(10), isNull(), any());
    }

    @Test
    void getTopics_returns200() throws Exception {
        when(topicService.getAllGrouped()).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/topics"))
                .andExpect(status().isOk());
    }
}
