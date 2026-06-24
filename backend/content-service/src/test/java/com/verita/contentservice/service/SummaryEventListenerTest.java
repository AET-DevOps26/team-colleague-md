package com.verita.contentservice.service;

import com.verita.contentservice.dto.GenAiSummarizeResponse;
import com.verita.contentservice.repository.PostRepository;
import com.verita.contentservice.client.GenAiClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class SummaryEventListenerTest {

    @Mock private PostRepository postRepository;
    @Mock private GenAiClient genAiClient;
    @InjectMocks private SummaryEventListener listener;

    private static final String AUTH = "Bearer token";

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void onSummaryRequested_success_persistsJoinedSummary() {
        UUID postId = UUID.randomUUID();
        PostSummaryRequestedEvent event = new PostSummaryRequestedEvent(postId, "Title", "Body", AUTH);
        when(genAiClient.summarize(AUTH, postId, "Title", "Body"))
                .thenReturn(new GenAiSummarizeResponse(postId.toString(), List.of("line one", "line two"), "model", null));

        listener.onSummaryRequested(event);

        verify(postRepository).updateSummary(postId, "line one\nline two");
    }

    @Test
    void onSummaryRequested_clientFailure_isSwallowedAndSkipsUpdate() {
        UUID postId = UUID.randomUUID();
        PostSummaryRequestedEvent event = new PostSummaryRequestedEvent(postId, "Title", "Body", AUTH);
        when(genAiClient.summarize(any(), any(), any(), any())).thenThrow(new RuntimeException("genai down"));

        // must not propagate — a failed summary should never break post creation
        listener.onSummaryRequested(event);

        verify(postRepository, never()).updateSummary(any(), anyString());
    }
}
