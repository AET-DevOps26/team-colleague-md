package com.verita.userservice.client;

import com.verita.userservice.exception.DeleteUserContentException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.UUID;

/**
 * Calls content-service's internal user-deletion cleanup endpoint. Authenticates as a service
 * via the shared {@code X-Internal-Service-Token} (ADR-0007) — it never forwards the caller's
 * user JWT (ADR-0006).
 */
@Component
public class ContentServiceClient {
    public static final String INTERNAL_TOKEN_HEADER = "X-Internal-Service-Token";
    private static final String DOWNSTREAM_SERVICE = "content-service";
    private static final String DELETE_USER_CONTENT_ENDPOINT = "/internal/v1/users/{userId}/data";

    private final RestClient contentClient;
    private final String internalServiceToken;

    public ContentServiceClient(@Value("${app.content-service-base-url}") String contentServiceBaseUrl,
                                @Value("${app.internal-service-token}") String internalServiceToken) {
        this.internalServiceToken = internalServiceToken;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.contentClient = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(contentServiceBaseUrl)
                .build();
    }

    public void deleteUserContentData(UUID userId) {
        try {
            contentClient.delete()
                    .uri(DELETE_USER_CONTENT_ENDPOINT, userId)
                    .header(INTERNAL_TOKEN_HEADER, internalServiceToken)
                    .retrieve()
                    .toBodilessEntity();
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
