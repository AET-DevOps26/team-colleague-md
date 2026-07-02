package com.verita.contentservice.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.verita.contentservice.client.GenAiClient;
import com.verita.contentservice.client.RecommendationClient;
import com.verita.contentservice.client.UserClient;
import com.verita.contentservice.dto.DigestEventDto;
import com.verita.contentservice.dto.DigestGenerateRequestDto;
import com.verita.contentservice.dto.DigestGenerateResponseDto;
import com.verita.contentservice.dto.DigestJobAcceptedDto;
import com.verita.contentservice.dto.DigestJobStatusDto;
import com.verita.contentservice.dto.DigestTopicDto;
import com.verita.contentservice.dto.TopicSubscriptionDto;
import com.verita.model.DigestGenerationResponse;
import com.verita.model.DigestPostRequest;
import com.verita.model.PostResponse;
import com.verita.model.Topic;
import java.net.URI;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class DailyDigestGenerationServiceTest {
    @Mock private UserClient userClient;
    @Mock private RecommendationClient recommendationClient;
    @Mock private GenAiClient genAiClient;
    @Mock private TopicService topicService;
    @Mock private PostService postService;

    private DailyDigestGenerationService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new DailyDigestGenerationService(
                userClient, recommendationClient, genAiClient, topicService, postService,
                "Europe/Berlin", 1, 100);
    }

    @Test
    void generateForUser_skipsWhenDailyDigestAlreadyExists() {
        UUID userId = UUID.randomUUID();
        PostResponse existing = new PostResponse().id(UUID.randomUUID()).title("Existing digest");
        when(postService.findPersonalDigest(eq(userId), any(), any())).thenReturn(Optional.of(existing));

        DigestGenerationResponse response = service.generateForUser(userId, false);

        assertEquals(DigestGenerationResponse.StatusEnum.SKIPPED, response.getStatus());
        assertEquals(existing, response.getPost());
        verify(recommendationClient, never()).getUserTopicSubscriptions(any());
        verify(genAiClient, never()).createDigestJob(any());
        verify(postService, never()).createDigest(any());
    }

    @Test
    void generateForUser_forceReplacesVisibleDigestAndStoresGenAiResult() {
        UUID userId = UUID.randomUUID();
        UUID topicId = UUID.randomUUID();
        PostResponse created = new PostResponse().id(UUID.randomUUID()).title("Your Thursday AI Digest");

        when(recommendationClient.getUserTopicSubscriptions(userId))
                .thenReturn(List.of(new TopicSubscriptionDto(topicId)));
        when(topicService.getByIds(List.of(topicId)))
                .thenReturn(List.of(new Topic().id(topicId).name("LLMs")));
        when(genAiClient.createDigestJob(any()))
                .thenReturn(new DigestJobAcceptedDto("job-1", "QUEUED", "/jobs/job-1",
                        OffsetDateTime.now(), "request-1", userId.toString()));
        when(genAiClient.getDigestJob("job-1")).thenReturn(new DigestJobStatusDto(
                "job-1", "SUCCEEDED", OffsetDateTime.now(), List.of(), "request-1",
                userId.toString(), OffsetDateTime.now(), OffsetDateTime.now(), digestResult(topicId), null));
        when(postService.createDigest(any())).thenReturn(created);

        DigestGenerationResponse response = service.generateForUser(userId, true);

        assertEquals(DigestGenerationResponse.StatusEnum.GENERATED, response.getStatus());
        assertEquals(created, response.getPost());
        verify(postService).softDeletePersonalDigests(eq(userId), any(), any());

        ArgumentCaptor<DigestGenerateRequestDto> genAiRequest = ArgumentCaptor.forClass(DigestGenerateRequestDto.class);
        verify(genAiClient).createDigestJob(genAiRequest.capture());
        assertEquals(userId.toString(), genAiRequest.getValue().userId());
        assertEquals(LocalDate.now(java.time.ZoneId.of("Europe/Berlin")), genAiRequest.getValue().digestDate());
        assertEquals("LLMs", genAiRequest.getValue().topics().get(0).name());

        ArgumentCaptor<DigestPostRequest> digestPost = ArgumentCaptor.forClass(DigestPostRequest.class);
        verify(postService).createDigest(digestPost.capture());
        DigestPostRequest request = digestPost.getValue();
        assertEquals("Your Thursday AI Digest", request.getTitle());
        assertEquals("Top story subtitle", request.getSummary().get());
        assertEquals(userId, request.getTargetUserId().get());
        assertEquals(List.of(URI.create("https://example.com/story")), request.getSourceUrl());
        assertNotNull(request.getContent());
    }

    private DigestGenerateResponseDto digestResult(UUID topicId) {
        OffsetDateTime now = OffsetDateTime.now();
        return new DigestGenerateResponseDto(
                now.toLocalDate(),
                now.minusDays(1),
                now,
                "Your Thursday AI Digest",
                "Top story subtitle",
                "Longer executive summary.",
                List.of(new DigestTopicDto(topicId.toString(), "LLMs")),
                List.of(new DigestEventDto(
                        "A useful LLM story",
                        List.of("One important bullet"),
                        List.of(topicId.toString()),
                        List.of("https://example.com/story"))),
                1,
                1,
                2,
                now,
                "test-model");
    }
}
