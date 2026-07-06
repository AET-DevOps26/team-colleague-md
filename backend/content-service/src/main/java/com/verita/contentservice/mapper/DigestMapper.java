package com.verita.contentservice.mapper;

import com.verita.contentservice.entity.DigestEntity;
import com.verita.contentservice.entity.DigestEventData;
import com.verita.contentservice.entity.DigestSourceData;
import com.verita.contentservice.entity.DigestTopicData;
import com.verita.model.DigestDetail;
import com.verita.model.DigestEvent;
import com.verita.model.DigestSource;
import com.verita.model.DigestSummary;
import com.verita.model.DigestType;
import com.verita.model.Topic;
import java.net.URI;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/** Projects {@link DigestEntity} to the generated summary/detail API models and back (ADR-0019). */
@Slf4j
@Component
public class DigestMapper {

    public DigestSummary toSummary(DigestEntity d) {
        return new DigestSummary()
                .id(d.getId())
                .digestType(DigestType.fromValue(d.getDigestType().name()))
                .digestDate(d.getDigestDate())
                .title(d.getTitle())
                .subtitle(d.getSubtitle())
                .summary(d.getSummary())
                .eventCount(d.getEventCount())
                .sourceCount(d.getSourceCount())
                .readTimeMinutes(d.getReadTimeMin())
                .previewHeadlines(safe(d.getPreviewHeadlines()))
                .topics(toTopics(d.getTopics()))
                .generatedAt(d.getGeneratedAt())
                .createdAt(d.getCreatedAt());
    }

    public DigestDetail toDetail(DigestEntity d) {
        return new DigestDetail()
                .id(d.getId())
                .digestType(DigestType.fromValue(d.getDigestType().name()))
                .digestDate(d.getDigestDate())
                .title(d.getTitle())
                .subtitle(d.getSubtitle())
                .summary(d.getSummary())
                .eventCount(d.getEventCount())
                .sourceCount(d.getSourceCount())
                .readTimeMinutes(d.getReadTimeMin())
                .previewHeadlines(safe(d.getPreviewHeadlines()))
                .topics(toTopics(d.getTopics()))
                .events(safe(d.getEvents()).stream().map(this::toApiEvent).toList())
                .model(d.getModel())
                .generatedAt(d.getGeneratedAt())
                .createdAt(d.getCreatedAt());
    }

    // --- API DigestEvent -> stored JSON payload ---
    public DigestEventData toEventData(DigestEvent e) {
        DigestEventData data = new DigestEventData();
        data.setHeadline(e.getHeadline());
        data.setSummaryBullets(safe(e.getSummaryBullets()));
        data.setTopicIds(safe(e.getTopicIds()).stream().map(UUID::toString).toList());
        data.setSources(safe(e.getSources()).stream().map(this::toSourceData).toList());
        return data;
    }

    private DigestSourceData toSourceData(DigestSource s) {
        DigestSourceData data = new DigestSourceData();
        data.setUrl(s.getUrl() == null ? null : s.getUrl().toString());
        data.setSourceName(s.getSourceName().orElse(null));
        data.setProvider(s.getProvider().orElse(null));
        data.setPublishedAt(s.getPublishedAt().map(OffsetDateTime::toString).orElse(null));
        data.setTitle(s.getTitle().orElse(null));
        return data;
    }

    private DigestEvent toApiEvent(DigestEventData e) {
        return new DigestEvent()
                .headline(e.getHeadline())
                .summaryBullets(safe(e.getSummaryBullets()))
                .topicIds(safe(e.getTopicIds()).stream().map(this::parseUuid).filter(java.util.Objects::nonNull).toList())
                .sources(safe(e.getSources()).stream().map(this::toApiSource).toList());
    }

    private DigestSource toApiSource(DigestSourceData s) {
        return new DigestSource()
                .url(parseUri(s.getUrl()))
                .sourceName(s.getSourceName())
                .provider(s.getProvider())
                .publishedAt(parseTime(s.getPublishedAt()))
                .title(s.getTitle());
    }

    private URI parseUri(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return URI.create(value);
        } catch (IllegalArgumentException e) {
            log.warn("Skipping unparseable url in digest payload: {}", value);
            return null;
        }
    }

    private List<Topic> toTopics(List<DigestTopicData> topics) {
        return safe(topics).stream()
                .map(t -> new Topic().id(parseUuid(t.getId())).name(t.getName()))
                .toList();
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            log.warn("Skipping unparseable UUID in digest payload: {}", value);
            return null;
        }
    }

    private OffsetDateTime parseTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value);
        } catch (DateTimeParseException e) {
            log.warn("Skipping unparseable publishedAt in digest payload: {}", value);
            return null;
        }
    }

    private static <T> List<T> safe(List<T> list) {
        return list == null ? List.of() : list;
    }
}
