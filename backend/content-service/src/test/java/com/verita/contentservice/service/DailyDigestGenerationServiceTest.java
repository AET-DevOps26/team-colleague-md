package com.verita.contentservice.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
import com.verita.contentservice.dto.DigestSourceDto;
import com.verita.contentservice.dto.DigestTopicDto;
import com.verita.contentservice.dto.TopicSubscriptionDto;
import com.verita.contentservice.entity.DigestEntity;
import com.verita.contentservice.service.digest.DigestService;
import com.verita.model.CreateDigestRequest;
import com.verita.model.DigestDetail;
import com.verita.model.DigestGenerationResponse;
import com.verita.model.DigestType;
import com.verita.model.Topic;
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
    @Mock private DigestService digestService;

    private DailyDigestGenerationService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new DailyDigestGenerationService(
                userClient, recommendationClient, genAiClient, topicService, digestService,
                "Europe/Berlin", 1, 100);
    }

    @Test
    void generateForUser_skipsWhenDailyDigestAlreadyExists() {
        UUID userId = UUID.randomUUID();
        DigestEntity existing = new DigestEntity();
        DigestDetail detail = new DigestDetail().id(UUID.randomUUID()).title("Existing digest");
        when(digestService.findPersonalForDate(eq(userId), any())).thenReturn(Optional.of(existing));
        when(digestService.toDetail(existing)).thenReturn(detail);

        DigestGenerationResponse response = service.generateForUser(userId, false);

        assertEquals(DigestGenerationResponse.StatusEnum.SKIPPED, response.getStatus());
        assertEquals(detail, response.getDigest());
        verify(recommendationClient, never()).getUserTopicSubscriptions(any());
        verify(genAiClient, never()).createDigestJob(any());
        verify(digestService, never()).createDigest(any());
    }

    @Test
    void generateForUser_forceReplacesVisibleDigestAndStoresGenAiResult() {
        UUID userId = UUID.randomUUID();
        UUID topicId = UUID.randomUUID();
        DigestDetail created = new DigestDetail().id(UUID.randomUUID()).title("Your Thursday AI Digest");

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
        when(digestService.createDigest(any())).thenReturn(created);

        DigestGenerationResponse response = service.generateForUser(userId, true);

        assertEquals(DigestGenerationResponse.StatusEnum.GENERATED, response.getStatus());
        assertEquals(created, response.getDigest());
        verify(digestService).deletePersonalForDate(eq(userId), any());

        ArgumentCaptor<DigestGenerateRequestDto> genAiRequest = ArgumentCaptor.forClass(DigestGenerateRequestDto.class);
        verify(genAiClient).createDigestJob(genAiRequest.capture());
        assertEquals(userId.toString(), genAiRequest.getValue().userId());
        assertEquals(LocalDate.now(java.time.ZoneId.of("Europe/Berlin")), genAiRequest.getValue().digestDate());
        assertEquals("LLMs", genAiRequest.getValue().topics().get(0).name());

        ArgumentCaptor<CreateDigestRequest> createRequest = ArgumentCaptor.forClass(CreateDigestRequest.class);
        verify(digestService).createDigest(createRequest.capture());
        CreateDigestRequest request = createRequest.getValue();
        assertEquals(DigestType.PERSONAL, request.getDigestType());
        assertFalse(request.getTitle().isPresent());
        assertEquals("Top story subtitle", request.getSubtitle().get());
        assertEquals(userId, request.getTargetUserId().get());
        assertEquals("https://example.com/story", request.getEvents().get(0).getSources().get(0).getUrl().toString());
    }

    @Test
    void generateForUser_assignsPublicDigestWhenUserHasNoSubscriptions() {
        UUID userId = UUID.randomUUID();
        UUID publicId = UUID.randomUUID();
        DigestEntity publicDigest = new DigestEntity();
        publicDigest.setId(publicId);
        DigestDetail publicDetail = new DigestDetail().id(publicId).digestType(DigestType.PUBLIC);

        when(digestService.findPersonalForDate(eq(userId), any())).thenReturn(Optional.empty());
        when(recommendationClient.getUserTopicSubscriptions(userId)).thenReturn(List.of());
        when(digestService.findPublicForDate(any())).thenReturn(Optional.of(publicDigest));
        when(digestService.toDetail(publicDigest)).thenReturn(publicDetail);

        DigestGenerationResponse response = service.generateForUser(userId, false);

        assertEquals(DigestGenerationResponse.StatusEnum.ASSIGNED_PUBLIC, response.getStatus());
        assertEquals(publicDetail, response.getDigest());
        verify(digestService).assignPublicDigest(eq(userId), any(), eq(publicId));
        verify(genAiClient, never()).createDigestJob(any());
    }

    private DigestGenerateResponseDto digestResult(UUID topicId) {
        OffsetDateTime now = OffsetDateTime.now();
        return new DigestGenerateResponseDto(
                now.toLocalDate(),
                now.minusDays(1),
                now,
                "Top story subtitle",
                "Longer executive summary.",
                List.of(new DigestTopicDto(topicId.toString(), "LLMs")),
                List.of(new DigestEventDto(
                        "A useful LLM story",
                        List.of("One important bullet"),
                        List.of(topicId.toString()),
                        List.of(new DigestSourceDto("https://example.com/story", "Example",
                                "gnews", now, "Story title")))),
                1,
                1,
                2,
                now,
                "test-model");
    }
}
