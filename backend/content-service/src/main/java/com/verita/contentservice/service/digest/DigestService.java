package com.verita.contentservice.service.digest;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

import com.verita.contentservice.client.UserClient;
import com.verita.contentservice.dto.UserProfileDto;
import com.verita.contentservice.entity.DigestAssignmentEntity;
import com.verita.contentservice.entity.DigestAssignmentId;
import com.verita.contentservice.entity.DigestEntity;
import com.verita.contentservice.entity.DigestEventData;
import com.verita.contentservice.entity.DigestSourceData;
import com.verita.contentservice.entity.DigestTopicData;
import com.verita.contentservice.entity.DigestTypeValue;
import com.verita.contentservice.mapper.DigestMapper;
import com.verita.contentservice.repository.DigestAssignmentRepository;
import com.verita.contentservice.repository.DigestRepository;
import com.verita.contentservice.security.SecurityUtils;
import com.verita.model.CreateDigestRequest;
import com.verita.model.DigestDetail;
import com.verita.model.DigestSummary;
import com.verita.model.DigestSummaryPage;
import com.verita.model.DigestType;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Read/write access to the standalone digest entity (ADR-0019). Enforces the access rule carried
 * over from ADR-0016 (personal digests are 404 for non-owners; public digests are open) and owns
 * the write-time denormalization of {@code previewHeadlines} / counts.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DigestService {
    private static final int MAX_PAGE_SIZE = 50;
    private static final int PREVIEW_HEADLINE_COUNT = 3;
    private static final int MAX_TITLE_LENGTH = 200;
    private static final DateTimeFormatter TITLE_DATE_FORMATTER =
            DateTimeFormatter.ofPattern("MMMM d, uuuu", Locale.ENGLISH);

    private final DigestRepository digestRepository;
    private final DigestAssignmentRepository assignmentRepository;
    private final DigestMapper digestMapper;
    private final SecurityUtils securityUtils;
    private final UserClient userClient;

    /**
     * Persists an already-generated digest, replacing any caller title with the deterministic
     * personal/public title and computing denormalized fields.
     *
     * @param request generated digest content and target metadata
     * @return the stored digest detail
     * @throws ResponseStatusException when the target user conflicts with the digest type
     */
    @Transactional
    public DigestDetail createDigest(CreateDigestRequest request) {
        DigestTypeValue type = DigestTypeValue.valueOf(request.getDigestType().getValue());
        UUID targetUserId = request.getTargetUserId().orElse(null);
        if (type == DigestTypeValue.PUBLIC && targetUserId != null) {
            throw new ResponseStatusException(BAD_REQUEST, "PUBLIC digest must not carry a targetUserId.");
        }
        if (type == DigestTypeValue.PERSONAL && targetUserId == null) {
            throw new ResponseStatusException(BAD_REQUEST, "PERSONAL digest requires a targetUserId.");
        }

        List<DigestEventData> events = request.getEvents().stream()
                .map(digestMapper::toEventData)
                .toList();

        DigestEntity entity = new DigestEntity();
        entity.setDigestType(type);
        entity.setTargetUserId(targetUserId);
        entity.setDigestDate(request.getDigestDate());
        entity.setTitle(titleFor(type, targetUserId, request.getDigestDate()));
        entity.setSubtitle(request.getSubtitle().orElse(null));
        entity.setSummary(request.getSummary().orElse(null));
        entity.setEvents(events);
        entity.setTopics(toTopicData(request));
        entity.setEventCount(request.getEventCount().orElse(events.size()));
        entity.setSourceCount(request.getSourceCount().orElse(distinctSourceCount(events)));
        entity.setReadTimeMin(request.getReadTimeMinutes().orElse(1));
        entity.setPreviewHeadlines(previewHeadlines(events));
        entity.setModel(request.getModel().orElse(null));
        entity.setGeneratedAt(request.getGeneratedAt().orElse(null));

        DigestEntity saved = digestRepository.save(entity);
        log.info("Stored {} digest id={} date={} events={}", type, saved.getId(), saved.getDigestDate(), events.size());
        return digestMapper.toDetail(saved);
    }

    /**
     * Builds the persisted title for a digest. Public digests use the community title; personal
     * digests use the target user's trimmed display name when available and otherwise fall back to
     * the generic personal title. Profile lookup failures are logged and treated as unavailable
     * profile data, and personal titles exceeding the persistence limit also use the fallback.
     *
     * @param type whether the digest is public or personal
     * @param targetUserId target user for a personal digest; ignored for public digests
     * @param digestDate date displayed in the title
     * @return a deterministic title no longer than {@value MAX_TITLE_LENGTH} characters
     */
    private String titleFor(DigestTypeValue type, UUID targetUserId, LocalDate digestDate) {
        String formattedDate = TITLE_DATE_FORMATTER.format(digestDate);
        if (type == DigestTypeValue.PUBLIC) {
            return "Verita Community Digest — " + formattedDate;
        }
        String fallbackTitle = "Your AI Digest — " + formattedDate;
        UserProfileDto profile;
        try {
            profile = userClient.getUserById(targetUserId);
        } catch (Exception e) {
            log.warn("Failed to resolve display name for digest title userId={}: {}", targetUserId, e.getMessage());
            return fallbackTitle;
        }
        String displayName = profile == null ? null : profile.displayName();
        if (displayName == null || displayName.isBlank()) {
            return fallbackTitle;
        }
        String personalTitle = displayName.strip() + "’s AI Digest — " + formattedDate;
        int titleLength = personalTitle.codePointCount(0, personalTitle.length());
        return titleLength <= MAX_TITLE_LENGTH ? personalTitle : fallbackTitle;
    }

    @Transactional(readOnly = true)
    public DigestSummaryPage getMyDigests(int page, int size) {
        UUID userId = securityUtils.getCurrentUserId();
        Page<DigestEntity> result = digestRepository.findHistoryForUser(
                userId, PageRequest.of(page, clampPageSize(size)));
        return new DigestSummaryPage()
                .content(result.getContent().stream().map(digestMapper::toSummary).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalPages(result.getTotalPages())
                .totalElements((int) result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public DigestDetail getDigestById(UUID id) {
        DigestEntity digest = digestRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
        // Personal digests are readable only by their target; hide existence from everyone else
        // with 404 (ADR-0016). Public digests are open, including logged-out.
        if (digest.getDigestType() == DigestTypeValue.PERSONAL
                && !Objects.equals(digest.getTargetUserId(), securityUtils.getCurrentUserIdOptional().orElse(null))) {
            throw new ResponseStatusException(NOT_FOUND);
        }
        return digestMapper.toDetail(digest);
    }

    @Transactional(readOnly = true)
    public DigestSummary getPublicTodayDigest() {
        return digestRepository.findFirstByDigestTypeOrderByDigestDateDescCreatedAtDesc(DigestTypeValue.PUBLIC)
                .map(digestMapper::toSummary)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND));
    }

    // --- helpers used by the daily job ---

    public Optional<DigestEntity> findPublicForDate(LocalDate date) {
        return digestRepository.findFirstByDigestTypeAndDigestDateOrderByCreatedAtDesc(DigestTypeValue.PUBLIC, date);
    }

    public Optional<DigestEntity> findPersonalForDate(UUID userId, LocalDate date) {
        return digestRepository.findFirstByDigestTypeAndTargetUserIdAndDigestDateOrderByCreatedAtDesc(
                DigestTypeValue.PERSONAL, userId, date);
    }

    public DigestDetail toDetail(DigestEntity entity) {
        return digestMapper.toDetail(entity);
    }

    /** Removes any existing personal digests for the user/day so a forced regeneration replaces them. */
    @Transactional
    public void deletePersonalForDate(UUID userId, LocalDate date) {
        digestRepository.deleteByDigestTypeAndTargetUserIdAndDigestDate(DigestTypeValue.PERSONAL, userId, date);
    }

    /** Assigns the day's public digest to a zero-subscription user (idempotent per user/day). */
    @Transactional
    public void assignPublicDigest(UUID userId, LocalDate date, UUID publicDigestId) {
        if (assignmentRepository.findByIdUserIdAndIdDigestDate(userId, date).isPresent()) {
            return;
        }
        assignmentRepository.save(new DigestAssignmentEntity(new DigestAssignmentId(userId, date), publicDigestId));
    }

    DigestType toApiType(DigestTypeValue value) {
        return DigestType.fromValue(value.name());
    }

    private List<DigestTopicData> toTopicData(CreateDigestRequest request) {
        List<com.verita.model.DigestTopicRef> topics = request.getTopics();
        if (topics == null) {
            return List.of();
        }
        return topics.stream()
                .filter(t -> t.getId() != null && t.getName() != null)
                .map(t -> new DigestTopicData(t.getId().toString(), t.getName()))
                .toList();
    }

    private List<String> previewHeadlines(List<DigestEventData> events) {
        return events.stream()
                .map(DigestEventData::getHeadline)
                .filter(Objects::nonNull)
                .limit(PREVIEW_HEADLINE_COUNT)
                .toList();
    }

    private int distinctSourceCount(List<DigestEventData> events) {
        Set<String> urls = new LinkedHashSet<>();
        for (DigestEventData event : events) {
            if (event.getSources() != null) {
                event.getSources().stream()
                        .map(DigestSourceData::getUrl)
                        .filter(Objects::nonNull)
                        .forEach(urls::add);
            }
        }
        return urls.size();
    }

    private static int clampPageSize(int size) {
        if (size < 1) {
            return 1;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}
