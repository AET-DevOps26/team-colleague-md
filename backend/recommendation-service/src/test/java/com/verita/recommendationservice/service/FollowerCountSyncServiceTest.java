package com.verita.recommendationservice.service;

import com.verita.recommendationservice.client.ContentClient;
import com.verita.recommendationservice.service.feed.TopicNameResolver;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FollowerCountSyncServiceTest {

    @Mock private ContentClient contentClient;
    @Mock private TopicNameResolver topicNameResolver;
    @InjectMocks private FollowerCountSyncService service;

    private final UUID topicId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void syncTopicDelta_resolvedName_appliesDelta() {
        when(topicNameResolver.resolveName(topicId)).thenReturn("ai");
        service.syncTopicDelta(topicId, 1, "Bearer t");
        verify(contentClient).applyFollowerCountDelta("ai", 1);
    }

    @Test
    void syncTopicDelta_unresolvedName_skipsContentCall() {
        when(topicNameResolver.resolveName(topicId)).thenReturn(null);
        service.syncTopicDelta(topicId, 1, "Bearer t");
        verify(contentClient, never()).applyFollowerCountDelta(anyString(), anyInt());
    }

    @Test
    void syncTopicDelta_contentClientThrows_isSwallowed() {
        when(topicNameResolver.resolveName(topicId)).thenReturn("ai");
        doThrow(new RuntimeException("content down")).when(contentClient).applyFollowerCountDelta("ai", -1);
        assertDoesNotThrow(() -> service.syncTopicDelta(topicId, -1, "Bearer t"));
    }
}
