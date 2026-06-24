package com.verita.userservice.service;

import com.verita.userservice.exception.DeleteUserContentException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.UUID;

@Component
public class ContentServiceClient {
    private static final String DOWNSTREAM_SERVICE = "content-service";
    private static final String DELETE_USER_CONTENT_ENDPOINT = "/internal/v1/users/{userId}/data";

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
                .uri(DELETE_USER_CONTENT_ENDPOINT, userId);
        if (authorization != null && !authorization.isBlank()) {
            request = request.header(HttpHeaders.AUTHORIZATION, authorization);
        }
        try {
            request.retrieve().toBodilessEntity();
        } catch (RestClientResponseException ex) {
            throw new DeleteUserContentException(
                    userId,
                    DOWNSTREAM_SERVICE,
                    DELETE_USER_CONTENT_ENDPOINT,
                    ex.getStatusCode().value(),
                    ex.getResponseBodyAsString(),
                    ex
            );
        } catch (RestClientException ex) {
            throw new DeleteUserContentException(
                    userId,
                    DOWNSTREAM_SERVICE,
                    DELETE_USER_CONTENT_ENDPOINT,
                    null,
                    null,
                    ex
            );
        }
    }
}
