package com.verita.recommendationservice.client;

import com.verita.recommendationservice.client.dto.PostPageDto;
import com.verita.recommendationservice.client.dto.PostRankDto;
import com.verita.recommendationservice.client.dto.TopicDto;
import java.time.Duration;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Typed HTTP client for content-service — the platform's standard cross-service shape: a thin
 * {@link RestClient} with bounded timeouts and minimal hand-rolled DTOs (see ADR-0002). One
 * client per upstream service; the caller's bearer token is forwarded only on calls that need it.
 */
@Component
@Slf4j
public class ContentClient {

    private static final String INTERNAL_SERVICE_HEADER = "X-Internal-Service-Token";

    private final RestClient client;
    private final String internalServiceToken;

    public ContentClient(@Value("${app.content-service-base-url}") String baseUrl,
                         @Value("${app.internal-service-token}") String internalServiceToken) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.client = RestClient.builder().requestFactory(factory).baseUrl(baseUrl).build();
        this.internalServiceToken = internalServiceToken;
    }

    /**
     * Batch-resolves topic IDs to {@code {id, name}} via {@code GET /api/v1/topics/by-ids}
     * (public). Returns an empty list on any failure — name resolution is best-effort and must
     * never break the caller (#158).
     */
    public List<TopicDto> getTopicsByIds(Collection<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        try {
            TopicDto[] body = client.get()
                    .uri(uri -> uri.path("/api/v1/topics/by-ids").queryParam("ids", ids.toArray()).build())
                    .retrieve()
                    .body(TopicDto[].class);
            return body == null ? List.of() : List.of(body);
        } catch (Exception e) {
            log.warn("Failed to resolve topic names for {} ids: {}", ids.size(), e.getMessage());
            return List.of();
        }
    }

    /**
     * Fetches a page of recent posts (reverse-chronological), optionally filtered by topic, via
     * the public {@code GET /api/v1/posts}. Used to build the trending/personal ranking candidate
     * pool (#159). Returns an empty list on failure so the feed degrades rather than 500s.
     */
    public List<PostRankDto> getRecentPosts(String topic, int page, int size) {
        try {
            PostPageDto body = client.get()
                    .uri(uri -> {
                        uri.path("/api/v1/posts").queryParam("page", page).queryParam("size", size);
                        if (topic != null && !topic.isBlank()) {
                            uri.queryParam("topic", topic);
                        }
                        return uri.build();
                    })
                    .retrieve()
                    .body(PostPageDto.class);
            return body == null || body.content() == null ? List.of() : body.content();
        } catch (Exception e) {
            log.warn("Failed to fetch recent posts (topic={}, page={}): {}", topic, page, e.getMessage());
            return List.of();
        }
    }

    /**
     * Fetches a page of a single author's published posts via the public
     * {@code GET /api/v1/users/{id}/posts}. Used to source followed-users' posts for the personal
     * feed (#163). Returns an empty list on failure so one bad author never breaks the feed.
     */
    public List<PostRankDto> getUserPosts(UUID authorId, int page, int size) {
        try {
            PostPageDto body = client.get()
                    .uri(uri -> uri.path("/api/v1/users/{id}/posts")
                            .queryParam("page", page).queryParam("size", size).build(authorId))
                    .retrieve()
                    .body(PostPageDto.class);
            return body == null || body.content() == null ? List.of() : body.content();
        } catch (Exception e) {
            log.warn("Failed to fetch posts for followed user {}: {}", authorId, e.getMessage());
            return List.of();
        }
    }

    /**
     * Applies a single follower-count delta for a topic via {@code POST /internal/v1/topics/follower-counts},
     * authenticated as a service with the shared internal token (ADR-0007). content keys this endpoint
     * by topic <em>name</em>, so the caller must resolve the name first. Best-effort: exceptions
     * propagate to the async caller, which logs and swallows them (ADR-0002).
     */
    public void applyFollowerCountDelta(String topicName, int delta) {
        client.post()
                .uri("/internal/v1/topics/follower-counts")
                // Service-to-service auth (ADR-0007); the user token is no longer required here.
                .header(INTERNAL_SERVICE_HEADER, internalServiceToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("deltas", Map.of(topicName, delta)))
                .retrieve()
                .toBodilessEntity();
    }
}
