package com.verita.contentservice.service;

import com.verita.contentservice.client.GenAiClient;
import com.verita.contentservice.dto.LlmConfigDto;
import com.verita.contentservice.dto.LlmConfigUpdateDto;
import com.verita.model.LlmConfig;
import com.verita.model.LlmConfigUpdateRequest;
import com.verita.model.LlmProviderAvailability;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

/**
 * Admin operations that reach outside content-service's own data (ADR-0020).
 *
 * <p>These are a front door, not a second source of truth: the browser holds an admin JWT that
 * genai-service knows nothing about, so content-service authorizes the caller and forwards over the
 * internal-service-token channel (ADR-0007). On-demand digest generation lives in
 * {@link DigestGenerationJobService}, which has a job row to track.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final GenAiClient genAiClient;

    public LlmConfig getLlmConfig() {
        return toApiModel(callGenAi(genAiClient::getLlmConfig));
    }

    public LlmConfig updateLlmConfig(LlmConfigUpdateRequest request) {
        LlmConfigUpdateDto payload = new LlmConfigUpdateDto(request.getProvider(), request.getModel());
        return toApiModel(callGenAi(() -> genAiClient.updateLlmConfig(payload)));
    }

    /**
     * Translates genai-service's failures for an admin audience: a 4xx is the admin's own fault
     * (unknown or keyless provider) and is passed through as a 400 carrying GenAI's message; anything
     * else means the downstream is broken, which is a 502.
     */
    private LlmConfigDto callGenAi(GenAiCall call) {
        try {
            return call.execute();
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().is4xxClientError()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, genAiMessage(e));
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GenAI service returned an error.");
        } catch (RestClientException e) {
            log.warn("GenAI llm-config call failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GenAI service is unavailable.");
        }
    }

    /** GenAI reports errors as {@code {"detail": {"error": ..., "message": ...}}}. */
    private String genAiMessage(RestClientResponseException e) {
        String body = e.getResponseBodyAsString();
        return body == null || body.isBlank() ? "GenAI service rejected the request." : body;
    }

    private LlmConfig toApiModel(LlmConfigDto dto) {
        List<LlmProviderAvailability> providers = dto.availableProviders() == null ? List.of()
                : dto.availableProviders().stream()
                        .map(p -> new LlmProviderAvailability(p.name(), p.configured()))
                        .toList();
        return new LlmConfig()
                .provider(dto.provider())
                .model(dto.model())
                .temperature(dto.temperature())
                .availableProviders(providers);
    }

    @FunctionalInterface
    private interface GenAiCall {
        LlmConfigDto execute();
    }
}
