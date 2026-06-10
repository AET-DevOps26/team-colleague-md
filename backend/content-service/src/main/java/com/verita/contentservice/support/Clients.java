package com.verita.contentservice.support;

import com.verita.contentservice.dto.GenAiSummarizeRequest;
import com.verita.contentservice.dto.GenAiSummarizeResponse;
import com.verita.contentservice.dto.UserPreferencesDto;
import com.verita.contentservice.dto.UserProfileDto;
import java.time.Duration;
import java.util.Collection;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Component
public class Clients {
    private static final Logger log = LoggerFactory.getLogger(Clients.class);
    private final RestClient userClient;
    private final RestClient genaiClient;

    public Clients(RestClient.Builder builder,
                   @Value("${app.user-service-base-url}") String userUrl,
                   @Value("${app.genai-service-base-url}") String genaiUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.userClient  = builder.requestFactory(factory).baseUrl(userUrl).build();
        this.genaiClient = this.userClient.mutate().baseUrl(genaiUrl).build();
    }

    public UserProfileDto getCurrentUser(String authorization) {
        try {
            return userClient.get()
                    .uri("/api/v1/users/me")
                    .header("Authorization", authorization)
                    .retrieve()
                    .body(UserProfileDto.class);
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token rejected by user service");
            }
            throw e;
        }
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

    public GenAiSummarizeResponse summarize(String authorization, UUID postId, String title, String content) {
        return genaiClient.post()
                .uri("/api/v1/genai/summarize")
                .header("Authorization", authorization)
                .contentType(MediaType.APPLICATION_JSON)
                .body(new GenAiSummarizeRequest(postId.toString(), content, title))
                .retrieve()
                .body(GenAiSummarizeResponse.class);
    }
}
