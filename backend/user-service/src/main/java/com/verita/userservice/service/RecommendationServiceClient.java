package com.verita.userservice.service;

import com.verita.userservice.exception.DeleteUserRecommendationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.UUID;

@Component
public class RecommendationServiceClient {
    private static final String DOWNSTREAM_SERVICE = "recommendation-service";
    private static final String DELETE_USER_RECOMMENDATION_ENDPOINT = "/internal/v1/users/{userId}/data";

    private final RestClient recommendationClient;

    public RecommendationServiceClient(
            @Value("${app.recommendation-service-base-url}") String recommendationServiceBaseUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.recommendationClient = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(recommendationServiceBaseUrl)
                .build();
    }

    public void deleteUserRecommendationData(UUID userId, String authorization) {
        RestClient.RequestHeadersSpec<?> request = recommendationClient.delete()
                .uri(DELETE_USER_RECOMMENDATION_ENDPOINT, userId);
        if (authorization != null && !authorization.isBlank()) {
            request = request.header(HttpHeaders.AUTHORIZATION, authorization);
        }
        try {
            request.retrieve().toBodilessEntity();
        } catch (RestClientResponseException ex) {
            throw new DeleteUserRecommendationException(
                    userId,
                    DOWNSTREAM_SERVICE,
                    DELETE_USER_RECOMMENDATION_ENDPOINT,
                    ex.getStatusCode().value(),
                    ex.getResponseBodyAsString(),
                    ex
            );
        } catch (RestClientException ex) {
            throw new DeleteUserRecommendationException(
                    userId,
                    DOWNSTREAM_SERVICE,
                    DELETE_USER_RECOMMENDATION_ENDPOINT,
                    null,
                    null,
                    ex
            );
        }
    }
}
