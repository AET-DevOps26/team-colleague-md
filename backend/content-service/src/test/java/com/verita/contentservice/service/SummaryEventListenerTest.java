package com.verita.contentservice.service;

import com.verita.contentservice.dto.GenAiSummarizeResponse;
import com.verita.contentservice.entity.SummaryStatus;
import com.verita.contentservice.repository.PostRepository;
import com.verita.contentservice.client.GenAiClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.retry.backoff.NoBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class SummaryEventListenerTest {

    @Mock private PostRepository postRepository;
    @Mock private GenAiClient genAiClient;
    private SummaryEventListener listener;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        RetryTemplate retryTemplate = new RetryTemplate();
        retryTemplate.setRetryPolicy(new SimpleRetryPolicy(3));
        retryTemplate.setBackOffPolicy(new NoBackOffPolicy());
        listener = new SummaryEventListener(postRepository, genAiClient, retryTemplate);
    }

    @Test
    void onSummaryRequested_success_persistsJoinedSummaryAndMetadata() {
        UUID postId = UUID.randomUUID();
        PostSummaryRequestedEvent event = new PostSummaryRequestedEvent(postId, "Title", "Body");
        when(genAiClient.summarize(postId, "Title", "Body"))
                .thenReturn(new GenAiSummarizeResponse(postId.toString(), List.of("line one", "line two"), "model", null));

        listener.onSummaryRequested(event);

        verify(postRepository).completeSummary(
                eq(postId),
                eq("line one\nline two"),
                any(OffsetDateTime.class),
                eq("model"),
                eq(SummaryStatus.COMPLETED));
        verify(postRepository, never()).updateSummaryStatus(any(), eq(SummaryStatus.FAILED));
    }

    @Test
    void onSummaryRequested_clientFailure_marksFailedAfterRetries() {
        UUID postId = UUID.randomUUID();
        PostSummaryRequestedEvent event = new PostSummaryRequestedEvent(postId, "Title", "Body");
        when(genAiClient.summarize(any(), any(), any())).thenThrow(new RuntimeException("genai down"));

        // must not propagate — a failed summary should never break post creation
        listener.onSummaryRequested(event);

        verify(genAiClient, times(3)).summarize(postId, "Title", "Body");
        verify(postRepository, never()).completeSummary(any(), any(), any(), any(), any());
        verify(postRepository).updateSummaryStatus(postId, SummaryStatus.FAILED);
    }
}
