package com.verita.contentservice.client;

import com.verita.contentservice.dto.TopicSubscriptionDto;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class RecommendationClient {
    public static final String INTERNAL_TOKEN_HEADER = "X-Internal-Service-Token";

    private final RestClient recommendationClient;
    private final String internalServiceToken;

    public RecommendationClient(@Value("${app.recommendation-service-base-url}") String recommendationUrl,
                                @Value("${app.internal-service-token}") String internalServiceToken) {
        this.internalServiceToken = internalServiceToken;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.recommendationClient = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(recommendationUrl)
                .build();
    }

    public List<TopicSubscriptionDto> getUserTopicSubscriptions(UUID userId) {
        TopicSubscriptionDto[] body = recommendationClient.get()
                .uri("/internal/v1/users/{userId}/topic-subscriptions", userId)
                .header(INTERNAL_TOKEN_HEADER, internalServiceToken)
                .retrieve()
                .body(TopicSubscriptionDto[].class);
        return body == null ? List.of() : List.of(body);
    }
}
