package com.verita.contentservice.support;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.verita.contentservice.dto.GenAiSummarizeRequest;
import com.verita.contentservice.dto.GenAiSummarizeResponse;
import com.verita.contentservice.dto.UserProfileDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
@Component
public class Clients {
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    @Value("${app.user-service-base-url}")
    private String userServiceBaseUrl;
    @Value("${app.genai-service-base-url}")
    private String genaiServiceBaseUrl;
    public UserProfileDto getCurrentUser(String authorization) {
        return getJson(userServiceBaseUrl + "/api/v1/users/me", authorization, UserProfileDto.class);
    }
    public UserProfileDto getUserById(UUID id) {
        return getJson(userServiceBaseUrl + "/api/v1/users/" + id, null, UserProfileDto.class);
    }
    public Map<UUID, UserProfileDto> getUsersByIds(Collection<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        Map<UUID, UserProfileDto> result = new ConcurrentHashMap<>();
        ids.parallelStream().forEach(id -> {
            try { result.put(id, getUserById(id)); } catch (Exception ignored) {}
        });
        return Collections.unmodifiableMap(result);
    }
    public GenAiSummarizeResponse summarize(String authorization, UUID postId, String title, String content) {
        var request = new GenAiSummarizeRequest(postId.toString(), content, title);
        return postJson(genaiServiceBaseUrl + "/api/v1/genai/summarize", authorization, request, GenAiSummarizeResponse.class);
    }
    private <T> T getJson(String url, String authorization, Class<T> type) {
        try {
            var builder = HttpRequest.newBuilder(URI.create(url)).GET().header("Accept", "application/json");
            if (authorization != null && !authorization.isBlank()) builder.header("Authorization", authorization);
            var response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return objectMapper.readValue(response.body(), type);
            }
            throw new IllegalStateException("Downstream call failed: " + response.statusCode() + " from " + url);
        } catch (IOException | InterruptedException e) {
            throw new IllegalStateException("Downstream call failed: " + url, e);
        }
    }
    private <T> T postJson(String url, String authorization, Object body, Class<T> type) {
        try {
            var builder = HttpRequest.newBuilder(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8));
            if (authorization != null && !authorization.isBlank()) builder.header("Authorization", authorization);
            var response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return objectMapper.readValue(response.body(), type);
            }
            throw new IllegalStateException("Downstream call failed: " + response.statusCode() + " from " + url + " body=" + response.body());
        } catch (IOException | InterruptedException e) {
            throw new IllegalStateException("Downstream call failed: " + url, e);
        }
    }
}
