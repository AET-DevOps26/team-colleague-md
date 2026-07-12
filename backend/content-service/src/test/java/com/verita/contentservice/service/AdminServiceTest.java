package com.verita.contentservice.service;

import com.verita.contentservice.client.GenAiClient;
import com.verita.contentservice.dto.LlmConfigDto;
import com.verita.contentservice.dto.LlmConfigUpdateDto;
import com.verita.contentservice.dto.LlmProviderAvailabilityDto;
import com.verita.model.LlmConfig;
import com.verita.model.LlmConfigUpdateRequest;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the admin GenAI proxy and the background digest trigger (ADR-0020).
 */
@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock private GenAiClient genAiClient;
    @Mock private DailyDigestGenerationService digestGenerationService;
    @InjectMocks private AdminService adminService;

    private static LlmConfigDto genAiConfig() {
        return new LlmConfigDto("nvidia", "moonshotai/kimi-k2.6", 0.3f, List.of(
                new LlmProviderAvailabilityDto("nvidia", true),
                new LlmProviderAvailabilityDto("openrouter", false)));
    }

    @Test
    void getLlmConfig_mapsGenAiResponseIncludingProviderAvailability() {
        when(genAiClient.getLlmConfig()).thenReturn(genAiConfig());

        LlmConfig result = adminService.getLlmConfig();

        assertThat(result.getProvider()).isEqualTo("nvidia");
        assertThat(result.getModel()).isEqualTo("moonshotai/kimi-k2.6");
        assertThat(result.getTemperature()).isEqualTo(0.3f);
        assertThat(result.getAvailableProviders())
                .extracting(p -> p.getName() + ":" + p.getConfigured())
                .containsExactly("nvidia:true", "openrouter:false");
    }

    @Test
    void updateLlmConfig_forwardsProviderAndModelToGenAi() {
        when(genAiClient.updateLlmConfig(any())).thenReturn(genAiConfig());

        adminService.updateLlmConfig(new LlmConfigUpdateRequest().provider("google").model("gemini-2.5-pro"));

        ArgumentCaptor<LlmConfigUpdateDto> sent = ArgumentCaptor.forClass(LlmConfigUpdateDto.class);
        verify(genAiClient).updateLlmConfig(sent.capture());
        assertThat(sent.getValue()).isEqualTo(new LlmConfigUpdateDto("google", "gemini-2.5-pro"));
    }

    @Test
    void updateLlmConfig_genAiRejectsKeylessProvider_becomes400NotA502() {
        when(genAiClient.updateLlmConfig(any())).thenThrow(HttpClientErrorException.create(
                HttpStatus.BAD_REQUEST, "Bad Request", null,
                "{\"detail\":{\"error\":\"provider_not_configured\"}}".getBytes(StandardCharsets.UTF_8),
                StandardCharsets.UTF_8));

        assertThatThrownBy(() -> adminService.updateLlmConfig(
                new LlmConfigUpdateRequest().provider("openrouter").model("some/model")))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void getLlmConfig_genAiUnreachable_becomes502() {
        when(genAiClient.getLlmConfig()).thenThrow(new ResourceAccessException("connection refused"));

        assertThatThrownBy(() -> adminService.getLlmConfig())
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_GATEWAY));
    }

    @Test
    void generateUserDigestAsync_delegatesToTheDailyOrchestrationWithForceFlag() {
        UUID userId = UUID.randomUUID();

        adminService.generateUserDigestAsync(userId, true);

        verify(digestGenerationService).generateForUser(userId, true);
    }

    @Test
    void generateUserDigestAsync_swallowsFailure_soTheBackgroundThreadNeverBubbles() {
        UUID userId = UUID.randomUUID();
        doThrow(new IllegalStateException("genai down"))
                .when(digestGenerationService).generateForUser(any(), anyBoolean());

        adminService.generateUserDigestAsync(userId, false);

        verify(digestGenerationService).generateForUser(userId, false);
    }
}
