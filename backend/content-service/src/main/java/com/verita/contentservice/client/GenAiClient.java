package com.verita.contentservice.client;

import com.verita.contentservice.dto.GenAiSummarizeRequest;
import com.verita.contentservice.dto.GenAiSummarizeResponse;
import java.time.Duration;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Requests AI post summaries from genai-service (ADR-0002). */
@Component
public class GenAiClient {

    private final RestClient genaiClient;

    public GenAiClient(@Value("${app.genai-service-base-url}") String genaiUrl) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.genaiClient = RestClient.builder().requestFactory(factory).baseUrl(genaiUrl).build();
    }

    /** Forwards the caller's bearer token (ADR-0002); fired from an async best-effort listener. */
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
