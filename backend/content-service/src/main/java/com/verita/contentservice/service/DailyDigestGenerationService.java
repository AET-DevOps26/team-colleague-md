package com.verita.contentservice.service;

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
import com.verita.contentservice.dto.UserDigestRecipientDto;
import com.verita.contentservice.dto.UserDigestRecipientPageDto;
import com.verita.model.DigestGenerationResponse;
import com.verita.model.DigestPostRequest;
import com.verita.model.PostResponse;
import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Service
public class DailyDigestGenerationService {
    private static final int RECIPIENT_PAGE_SIZE = 100;
    private static final int MAX_SOURCES_PER_TOPIC = 5;
    private static final int MAX_EVENTS = 8;
    private static final String TONE = "technical";
    private static final int Free_News_Api_Delay_Hours = 12;

    private final UserClient userClient;
    private final RecommendationClient recommendationClient;
    private final GenAiClient genAiClient;
    private final TopicService topicService;
    private final PostService postService;
    private final ZoneId digestZone;
    private final long pollIntervalMs;
    private final long maxWaitMs;

    public DailyDigestGenerationService(UserClient userClient,
                                        RecommendationClient recommendationClient,
                                        GenAiClient genAiClient,
                                        TopicService topicService,
                                        PostService postService,
                                        @Value("${app.digest.timezone}") String digestTimezone,
                                        @Value("${app.digest.poll-interval-ms}") long pollIntervalMs,
                                        @Value("${app.digest.max-wait-ms}") long maxWaitMs) {
        this.userClient = userClient;
        this.recommendationClient = recommendationClient;
        this.genAiClient = genAiClient;
        this.topicService = topicService;
        this.postService = postService;
        this.digestZone = ZoneId.of(digestTimezone);
        this.pollIntervalMs = pollIntervalMs;
        this.maxWaitMs = maxWaitMs;
    }

    public void generateDueDigests() {
        int page = 0;
        while (true) {
            UserDigestRecipientPageDto recipients = userClient.getDigestRecipients("DAILY", page, RECIPIENT_PAGE_SIZE);
            List<UserDigestRecipientDto> users = recipients == null || recipients.content() == null
                    ? List.of() : recipients.content();
            for (UserDigestRecipientDto recipient : users) {
                if (recipient == null || recipient.id() == null) {
                    continue;
                }
                try {
                    generateForUser(recipient.id(), false);
                } catch (Exception e) {
                    log.warn("Daily digest generation failed for userId={}: {}", recipient.id(), e.getMessage());
                }
            }
            if (recipients == null || !recipients.hasNext()) {
                break;
            }
            page++;
        }
    }

    public DigestGenerationResponse generateForUser(UUID userId, boolean force) {
        DigestWindow window = currentWindow();
        if (!force) {
            Optional<DigestGenerationResponse> existing = skipIfDigestExists(userId, window);
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        List<DigestTopicDto> topics = resolveTopics(userId);
        if (topics.isEmpty()) {
            return skipped("User has no followed topics.", null);
        }

        DigestGenerateResponseDto result = runGenAiJob(userId, window, topics);
        if (!force) {
            // Re-check after the genai wait: another scheduler/manual run may have created it meanwhile.
            Optional<DigestGenerationResponse> existing = skipIfDigestExists(userId, window);
            if (existing.isPresent()) {
                return existing.get();
            }
        } else {
            postService.softDeletePersonalDigests(userId, window.start(), window.end());
        }

        PostResponse post = postService.createDigest(toDigestPostRequest(userId, result));
        return new DigestGenerationResponse(DigestGenerationResponse.StatusEnum.GENERATED, "Digest generated.")
                .post(post);
    }

    private DigestGenerateResponseDto runGenAiJob(UUID userId, DigestWindow window, List<DigestTopicDto> topics) {
        DigestGenerateRequestDto request = new DigestGenerateRequestDto(
                "content-daily-digest-" + window.date() + "-" + userId,
                userId.toString(),
                window.date(),
                window.start(),
                window.end(),
                digestZone.getId(),
                topics,
                MAX_SOURCES_PER_TOPIC,
                MAX_EVENTS,
                TONE
        );
        DigestJobAcceptedDto accepted = genAiClient.createDigestJob(request);
        if (accepted == null || accepted.jobId() == null || accepted.jobId().isBlank()) {
            throw badGateway("genai-service did not return a digest job id.");
        }
        return waitForResult(accepted.jobId());
    }

    private DigestGenerateResponseDto waitForResult(String jobId) {
        Instant deadline = Instant.now().plusMillis(maxWaitMs);
        while (Instant.now().isBefore(deadline)) {
            DigestJobStatusDto status = genAiClient.getDigestJob(jobId);
            if (status == null || status.status() == null) {
                throw badGateway("genai-service returned an empty digest job status.");
            }
            if ("SUCCEEDED".equals(status.status())) {
                if (status.result() == null) {
                    throw badGateway("genai-service marked digest job succeeded without a result.");
                }
                return status.result();
            }
            if ("FAILED".equals(status.status())) {
                String message = status.error() == null ? "Digest generation failed." : status.error().message();
                throw badGateway(message);
            }
            sleep();
        }
        throw badGateway("Timed out waiting for genai digest job.");
    }

    private List<DigestTopicDto> resolveTopics(UUID userId) {
        List<UUID> topicIds = recommendationClient.getUserTopicSubscriptions(userId).stream()
                .map(TopicSubscriptionDto::id)
                .filter(Objects::nonNull)
                .toList();
        if (topicIds.isEmpty()) {
            return List.of();
        }
        return topicService.getByIds(topicIds).stream()
                .filter(topic -> topic.getId() != null && topic.getName() != null && !topic.getName().isBlank())
                .map(topic -> new DigestTopicDto(topic.getId().toString(), topic.getName()))
                .toList();
    }

    private DigestPostRequest toDigestPostRequest(UUID userId, DigestGenerateResponseDto result) {
        return new DigestPostRequest(result.title(), renderMarkdown(result))
                .summary(result.topStorySubtitle())
                .sourceUrl(sourceUrls(result))
                .topics(topicNames(result))
                .targetUserId(userId);
    }

    private List<String> topicNames(DigestGenerateResponseDto result) {
        return safeTopics(result).stream()
                .map(DigestTopicDto::name)
                .filter(name -> name != null && !name.isBlank())
                .toList();
    }

    private List<URI> sourceUrls(DigestGenerateResponseDto result) {
        Set<String> urls = new LinkedHashSet<>();
        for (DigestEventDto event : safeEvents(result)) {
            if (event.sourceUrls() != null) {
                urls.addAll(event.sourceUrls());
            }
        }
        return urls.stream()
                .filter(url -> url != null && !url.isBlank())
                .map(URI::create)
                .toList();
    }

    private String renderMarkdown(DigestGenerateResponseDto result) {
        StringBuilder markdown = new StringBuilder();
        if (result.summary() != null && !result.summary().isBlank()) {
            markdown.append(result.summary()).append("\n\n");
        }
        for (DigestEventDto event : safeEvents(result)) {
            markdown.append("## ").append(event.headline()).append("\n\n");
            if (event.summaryBullets() != null) {
                for (String bullet : event.summaryBullets()) {
                    markdown.append("- ").append(bullet).append("\n");
                }
                markdown.append("\n");
            }
            if (event.sourceUrls() != null && !event.sourceUrls().isEmpty()) {
                markdown.append("Sources:\n");
                for (String url : event.sourceUrls()) {
                    markdown.append("- ").append(url).append("\n");
                }
                markdown.append("\n");
            }
        }
        return markdown.toString().trim();
    }

    private List<DigestEventDto> safeEvents(DigestGenerateResponseDto result) {
        return result.events() == null ? List.of() : result.events();
    }

    private List<DigestTopicDto> safeTopics(DigestGenerateResponseDto result) {
        return result.topics() == null ? List.of() : result.topics();
    }

    private DigestGenerationResponse skipped(String message, PostResponse post) {
        return new DigestGenerationResponse(DigestGenerationResponse.StatusEnum.SKIPPED, message).post(post);
    }

    private Optional<DigestGenerationResponse> skipIfDigestExists(UUID userId, DigestWindow window) {
        return postService.findPersonalDigest(userId, window.start().plusHours(Free_News_Api_Delay_Hours), window.end().plusHours(Free_News_Api_Delay_Hours))
                .map(existing -> skipped("Digest already exists for the current Platform Day.", existing));
    }

    private DigestWindow currentWindow() {
        LocalDate date = LocalDate.now(digestZone);
        ZonedDateTime start = date.atStartOfDay(digestZone).minusHours(Free_News_Api_Delay_Hours); // Free News API have news delayed for 12 hours, so we need to adjust the start time accordingly to avoid the time period in which the news is not available yet. This is a temporary solution until we can switch to a paid plan that provides real-time news.
        return new DigestWindow(date, start.toOffsetDateTime(), start.plusDays(1).toOffsetDateTime());
    }

    private void sleep() {
        try {
            Thread.sleep(pollIntervalMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw badGateway("Interrupted while waiting for genai digest job.");
        }
    }

    private ResponseStatusException badGateway(String message) {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, message);
    }

    private record DigestWindow(LocalDate date, OffsetDateTime start, OffsetDateTime end) {}
}
