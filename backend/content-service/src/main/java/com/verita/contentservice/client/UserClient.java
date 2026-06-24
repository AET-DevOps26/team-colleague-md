package com.verita.contentservice.client;

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
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Reads other users' profile data from user-service for author cards (ADR-0002). It does not resolve
 * the caller's identity — that comes from the verified token via SecurityUtils (ADR-0006).
 */
@Slf4j
@Component
public class UserClient {

    private final RestClient userClient;

    public UserClient(@Value("${app.user-service-base-url}") String userUrl) {
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
                .uri("/api/v1/users/{id}/preferences", id)
                .retrieve()
                .body(UserPreferencesDto.class);
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
