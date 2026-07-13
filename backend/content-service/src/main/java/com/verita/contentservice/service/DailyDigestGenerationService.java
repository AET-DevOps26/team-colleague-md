package com.verita.contentservice.service;

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
import com.verita.contentservice.dto.UserDigestRecipientDto;
import com.verita.contentservice.dto.UserDigestRecipientPageDto;
import com.verita.contentservice.entity.DigestEntity;
import com.verita.contentservice.service.digest.DigestService;
import com.verita.model.CreateDigestRequest;
import com.verita.model.DigestDetail;
import com.verita.model.DigestEvent;
import com.verita.model.DigestGenerationResponse;
import com.verita.model.DigestSource;
import com.verita.model.DigestTopicRef;
import com.verita.model.DigestType;
import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Orchestrates the daily digest run (ADR-0018/0019): one PUBLIC digest per day from platform
 * trending topics, then per recipient a freshly generated PERSONAL digest (subscribers) or an
 * assignment of the day's PUBLIC digest (zero-subscription users).
 */
@Slf4j
@Service
public class DailyDigestGenerationService {
    private static final int RECIPIENT_PAGE_SIZE = 100;
    private static final int MAX_SOURCES_PER_TOPIC = 5;
    private static final int MAX_EVENTS = 8;
    private static final int PUBLIC_DIGEST_TOPIC_LIMIT = 8;
    private static final String TONE = "technical";
    private static final int FREE_NEWS_API_DELAY_HOURS = 12;

    private final UserClient userClient;
    private final RecommendationClient recommendationClient;
    private final GenAiClient genAiClient;
    private final TopicService topicService;
    private final DigestService digestService;
    private final ZoneId digestZone;
    private final long pollIntervalMs;
    private final long maxWaitMs;

    public DailyDigestGenerationService(UserClient userClient,
                                        RecommendationClient recommendationClient,
                                        GenAiClient genAiClient,
                                        TopicService topicService,
                                        DigestService digestService,
                                        @Value("${app.digest.timezone}") String digestTimezone,
                                        @Value("${app.digest.poll-interval-ms}") long pollIntervalMs,
                                        @Value("${app.digest.max-wait-ms}") long maxWaitMs) {
        this.userClient = userClient;
        this.recommendationClient = recommendationClient;
        this.genAiClient = genAiClient;
        this.topicService = topicService;
        this.digestService = digestService;
        this.digestZone = ZoneId.of(digestTimezone);
        this.pollIntervalMs = pollIntervalMs;
        this.maxWaitMs = maxWaitMs;
    }

    public void generateDueDigests() {
        DigestWindow window = currentWindow();
        try {
            ensurePublicDigest(window);
        } catch (Exception e) {
            log.warn("Public digest generation failed for {}: {}", window.date(), e.getMessage());
        }
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

    /** Generates for the current Platform Day — what the scheduled run and self-service path want. */
    public DigestGenerationResponse generateForUser(UUID userId, boolean force) {
        return generateForUser(userId, currentPlatformDate(), force);
    }

    /**
     * Generates the digest a user would have received on {@code date}. Admins reach this to backfill
     * a day (ADR-0020); every day-scoped step below — the idempotency check, the public-digest
     * assignment, the news window handed to GenAI — keys off the requested date rather than today's.
     *
     * <p>Backfilling a distant past date is allowed but rarely useful: the external news sources are
     * queried for that day's window and return progressively less the further back it goes.
     */
    public DigestGenerationResponse generateForUser(UUID userId, LocalDate date, boolean force) {
        DigestWindow window = windowFor(date);
        if (!force) {
            Optional<DigestEntity> existingPersonal = digestService.findPersonalForDate(userId, window.date());
            if (existingPersonal.isPresent()) {
                return skipped("Digest already exists for " + window.date() + ".",
                        digestService.toDetail(existingPersonal.get()));
            }
        }

        List<DigestTopicDto> topics = resolveTopics(userId);
        if (topics.isEmpty()) {
            // Zero-subscription user: assign the day's public digest (ADR-0018).
            Optional<DigestEntity> publicDigest = ensurePublicDigest(window);
            if (publicDigest.isEmpty()) {
                return skipped("No public digest available to assign.", null);
            }
            digestService.assignPublicDigest(userId, window.date(), publicDigest.get().getId());
            return new DigestGenerationResponse(DigestGenerationResponse.StatusEnum.ASSIGNED_PUBLIC,
                    "Assigned the public digest.").digest(digestService.toDetail(publicDigest.get()));
        }

        DigestGenerateResponseDto result = runGenAiJob(userId, window, topics);
        if (!force) {
            Optional<DigestEntity> existingPersonal = digestService.findPersonalForDate(userId, window.date());
            if (existingPersonal.isPresent()) {
                return skipped("Digest already exists for " + window.date() + ".",
                        digestService.toDetail(existingPersonal.get()));
            }
        } else {
            digestService.deletePersonalForDate(userId, window.date());
        }

        DigestDetail digest = digestService.createDigest(
                toCreateRequest(DigestType.PERSONAL, userId, result));
        return new DigestGenerationResponse(DigestGenerationResponse.StatusEnum.GENERATED, "Digest generated.")
                .digest(digest);
    }

    /** Idempotently ensures exactly one PUBLIC digest exists for the window's day (ADR-0018). */
    public Optional<DigestEntity> ensurePublicDigest(DigestWindow window) {
        Optional<DigestEntity> existing = digestService.findPublicForDate(window.date());
        if (existing.isPresent()) {
            return existing;
        }
        List<DigestTopicDto> topics = resolveTrendingTopics();
        if (topics.isEmpty()) {
            log.warn("No trending topics available; skipping public digest for {}", window.date());
            return Optional.empty();
        }
        DigestGenerateResponseDto result = runGenAiJob(null, window, topics);
        // Re-check after the genai wait: a concurrent run may have created it meanwhile.
        Optional<DigestEntity> raced = digestService.findPublicForDate(window.date());
        if (raced.isPresent()) {
            return raced;
        }
        digestService.createDigest(toCreateRequest(DigestType.PUBLIC, null, result));
        return digestService.findPublicForDate(window.date());
    }

    private DigestGenerateResponseDto runGenAiJob(UUID userId, DigestWindow window, List<DigestTopicDto> topics) {
        DigestGenerateRequestDto request = new DigestGenerateRequestDto(
                "content-daily-digest-" + window.date() + "-" + (userId == null ? "public" : userId),
                userId == null ? null : userId.toString(),
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
        return toTopicDtos(topicIds);
    }

    private List<DigestTopicDto> resolveTrendingTopics() {
        List<UUID> topicIds = recommendationClient.getTrendingTopics(PUBLIC_DIGEST_TOPIC_LIMIT).stream()
                .map(TopicSubscriptionDto::id)
                .filter(Objects::nonNull)
                .toList();
        return toTopicDtos(topicIds);
    }

    private List<DigestTopicDto> toTopicDtos(List<UUID> topicIds) {
        if (topicIds.isEmpty()) {
            return List.of();
        }
        return topicService.getByIds(topicIds).stream()
                .filter(topic -> topic.getId() != null && topic.getName() != null && !topic.getName().isBlank())
                .map(topic -> new DigestTopicDto(topic.getId().toString(), topic.getName()))
                .toList();
    }

    private CreateDigestRequest toCreateRequest(DigestType type, UUID targetUserId, DigestGenerateResponseDto result) {
        return new CreateDigestRequest()
                .digestType(type)
                .targetUserId(targetUserId)
                .digestDate(result.digestDate())
                .title(result.title())
                .subtitle(result.topStorySubtitle())
                .summary(result.summary())
                .events(toApiEvents(result))
                .topics(toTopicRefs(result))
                .eventCount(result.eventCount())
                .sourceCount(result.sourceCount())
                .readTimeMinutes(result.readTimeMinutes())
                .model(result.model())
                .generatedAt(result.generatedAt());
    }

    private List<DigestEvent> toApiEvents(DigestGenerateResponseDto result) {
        return safeEvents(result).stream()
                .map(this::toApiEvent)
                .toList();
    }

    private DigestEvent toApiEvent(DigestEventDto event) {
        return new DigestEvent()
                .headline(event.headline())
                .summaryBullets(event.summaryBullets() == null ? List.of() : event.summaryBullets())
                .topicIds(event.topicIds() == null ? List.of()
                        : event.topicIds().stream().map(this::parseUuid).filter(Objects::nonNull).toList())
                .sources(event.sources() == null ? List.of()
                        : event.sources().stream().map(this::toApiSource).toList());
    }

    private DigestSource toApiSource(DigestSourceDto s) {
        return new DigestSource()
                .url(parseUri(s.url()))
                .sourceName(s.sourceName())
                .provider(s.provider())
                .publishedAt(s.publishedAt())
                .title(s.title());
    }

    private List<DigestTopicRef> toTopicRefs(DigestGenerateResponseDto result) {
        return safeTopics(result).stream()
                .filter(t -> t.id() != null && t.name() != null && !t.name().isBlank())
                .map(t -> new DigestTopicRef().id(parseUuid(t.id())).name(t.name()))
                .filter(ref -> ref.getId() != null)
                .toList();
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            log.warn("Skipping unparseable topic UUID from genai: {}", value);
            return null;
        }
    }

    private URI parseUri(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return URI.create(value);
        } catch (IllegalArgumentException e) {
            log.warn("Skipping unparseable source url from genai: {}", value);
            return null;
        }
    }

    private List<DigestEventDto> safeEvents(DigestGenerateResponseDto result) {
        return result.events() == null ? List.of() : result.events();
    }

    private List<DigestTopicDto> safeTopics(DigestGenerateResponseDto result) {
        return result.topics() == null ? List.of() : result.topics();
    }

    private DigestGenerationResponse skipped(String message, DigestDetail digest) {
        return new DigestGenerationResponse(DigestGenerationResponse.StatusEnum.SKIPPED, message).digest(digest);
    }

    /** Today in the digest timezone — the day the platform considers "current". */
    public LocalDate currentPlatformDate() {
        return LocalDate.now(digestZone);
    }

    private DigestWindow currentWindow() {
        return windowFor(currentPlatformDate());
    }

    private DigestWindow windowFor(LocalDate date) {
        // Free News API delays news ~12h; shift the window back so the period has available news.
        ZonedDateTime start = date.atStartOfDay(digestZone).minusHours(FREE_NEWS_API_DELAY_HOURS);
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

    public record DigestWindow(LocalDate date, OffsetDateTime start, OffsetDateTime end) {}
}
