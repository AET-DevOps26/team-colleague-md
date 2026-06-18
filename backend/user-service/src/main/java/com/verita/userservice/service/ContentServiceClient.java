package com.verita.userservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.UUID;

@Component
public class ContentServiceClient {
    private final RestClient contentClient;

    public ContentServiceClient(@Value("${app.content-service-base-url}") String contentServiceBaseUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.contentClient = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(contentServiceBaseUrl)
                .build();
    }

    public void deleteUserContentData(UUID userId, String authorization) {
        RestClient.RequestHeadersSpec<?> request = contentClient.delete()
                .uri("/internal/v1/users/{userId}/data", userId);
        if (authorization != null && !authorization.isBlank()) {
            request = request.header(HttpHeaders.AUTHORIZATION, authorization);
        }
        request.retrieve().toBodilessEntity();
    }
}
