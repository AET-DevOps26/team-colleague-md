package com.verita.contentservice.client;

import com.verita.contentservice.dto.DigestGenerateRequestDto;
import com.verita.contentservice.dto.DigestJobAcceptedDto;
import com.verita.contentservice.dto.DigestJobStatusDto;
import com.verita.contentservice.dto.GenAiSummarizeRequest;
import com.verita.contentservice.dto.GenAiSummarizeResponse;
import com.verita.contentservice.dto.LlmConfigDto;
import com.verita.contentservice.dto.LlmConfigUpdateDto;
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
    public static final String INTERNAL_TOKEN_HEADER = "X-Internal-Service-Token";

    private final RestClient genaiClient;
    private final String internalServiceToken;

    public GenAiClient(@Value("${app.genai-service-base-url}") String genaiUrl,
                       @Value("${app.internal-service-token}") String internalServiceToken) {
        this.internalServiceToken = internalServiceToken;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.genaiClient = RestClient.builder().requestFactory(factory).baseUrl(genaiUrl).build();
    }

    /** Fired from an async best-effort listener; genai work endpoints authenticate by service token. */
    public GenAiSummarizeResponse summarize(UUID postId, String title, String content) {
        return genaiClient.post()
                .uri("/api/v1/genai/summarize")
                .header(INTERNAL_TOKEN_HEADER, internalServiceToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(new GenAiSummarizeRequest(postId.toString(), content, title))
                .retrieve()
                .body(GenAiSummarizeResponse.class);
    }

    public DigestJobAcceptedDto createDigestJob(DigestGenerateRequestDto request) {
        return genaiClient.post()
                .uri("/api/v1/genai/digests/generate")
                .header(INTERNAL_TOKEN_HEADER, internalServiceToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(DigestJobAcceptedDto.class);
    }

    /** Reads genai-service's live (provider, model) pair and provider availability (ADR-0020). */
    public LlmConfigDto getLlmConfig() {
        return genaiClient.get()
                .uri("/internal/v1/llm-config")
                .header(INTERNAL_TOKEN_HEADER, internalServiceToken)
                .retrieve()
                .body(LlmConfigDto.class);
    }

    /**
     * Sets genai-service's in-memory (provider, model) override. genai-service answers 400 when the
     * provider is unknown or has no API key; the caller translates that into the admin's 400.
     */
    public LlmConfigDto updateLlmConfig(LlmConfigUpdateDto request) {
        return genaiClient.put()
                .uri("/internal/v1/llm-config")
                .header(INTERNAL_TOKEN_HEADER, internalServiceToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(LlmConfigDto.class);
    }

    public DigestJobStatusDto getDigestJob(String jobId) {
        return genaiClient.get()
                .uri("/api/v1/genai/digests/jobs/{jobId}", jobId)
                .header(INTERNAL_TOKEN_HEADER, internalServiceToken)
                .retrieve()
                .body(DigestJobStatusDto.class);
    }
}
