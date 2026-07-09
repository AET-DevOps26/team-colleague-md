package com.verita.contentservice.client;

import com.verita.contentservice.dto.UserDigestRecipientPageDto;
import com.verita.contentservice.dto.UserPreferencesDto;
import com.verita.contentservice.dto.UserProfileDto;
import java.time.Duration;
import java.util.Collection;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Reads other users' data from user-service: profile cards (ADR-0002) and the bookmark/like privacy
 * flags used to gate another user's profile tabs, fetched via the internal endpoint with the shared
 * service token (ADR-0007). It does not resolve the caller's identity — that comes from the verified
 * token via SecurityUtils (ADR-0006).
 */
@Slf4j
@Component
public class UserClient {

    public static final String INTERNAL_TOKEN_HEADER = "X-Internal-Service-Token";

    private final RestClient userClient;
    private final String internalServiceToken;

    public UserClient(@Value("${app.user-service-base-url}") String userUrl,
                      @Value("${app.internal-service-token}") String internalServiceToken) {
        this.internalServiceToken = internalServiceToken;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.userClient = RestClient.builder().requestFactory(factory).baseUrl(userUrl).build();
    }

    public UserProfileDto getUserById(UUID id) {
        return userClient.get()
                .uri("/api/v1/users/{id}", id)
                .retrieve()
                .body(UserProfileDto.class);
    }

    public UserPreferencesDto getUserPreferences(UUID id) {
        return userClient.get()
                .uri("/internal/v1/users/{id}/preferences", id)
                .header(INTERNAL_TOKEN_HEADER, internalServiceToken)
                .retrieve()
                .body(UserPreferencesDto.class);
    }

    public UserDigestRecipientPageDto getDigestRecipients(String frequency, int page, int size) {
        return userClient.get()
                .uri(uri -> uri.path("/internal/v1/users/digest-recipients")
                        .queryParam("frequency", frequency)
                        .queryParam("page", page)
                        .queryParam("size", size)
                        .build())
                .header(INTERNAL_TOKEN_HEADER, internalServiceToken)
                .retrieve()
                .body(UserDigestRecipientPageDto.class);
    }

    /**
     * Best-effort write-back of an author's aggregate profile counts (postCount, likeReceivedCount)
     * as posts are published/unpublished and likes come and go (issue #178, ADR-0007). Failures are
     * swallowed with a warning: count drift is acceptable, a broken post/like flow is not. A no-op
     * when both deltas are zero. TODO(#178): follower/following counts are not maintained yet.
     */
    public void applyUserStatsDelta(UUID authorId, int postCountDelta, int likeReceivedCountDelta) {
        if (postCountDelta == 0 && likeReceivedCountDelta == 0) return;
        try {
            userClient.post()
                    .uri("/internal/v1/users/{id}/stats/deltas", authorId)
                    .header(INTERNAL_TOKEN_HEADER, internalServiceToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("postCountDelta", postCountDelta, "likeReceivedCountDelta", likeReceivedCountDelta))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Failed to apply stats delta (post={}, like={}) to author {}: {}",
                    postCountDelta, likeReceivedCountDelta, authorId, e.getMessage());
        }
    }

    public Map<UUID, UserProfileDto> getUsersByIds(Collection<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        Map<UUID, UserProfileDto> result = new ConcurrentHashMap<>();
        ids.parallelStream().forEach(id -> {
            try { result.put(id, getUserById(id)); } catch (Exception e) {
                log.warn("Failed to fetch user {}: {}", id, e.getMessage());
            }
        });
        return Collections.unmodifiableMap(result);
    }
}
