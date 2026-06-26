package com.verita.recommendationservice.service.feed;

import com.verita.recommendationservice.client.ContentClient;
import com.verita.recommendationservice.client.dto.TopicDto;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TopicNameResolverTest {

    @Mock private ContentClient contentClient;
    private TopicNameResolver resolver;

    private final UUID topicId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        resolver = new TopicNameResolver(contentClient, 10);
    }

    @Test
    void resolve_fetchesMissesAndCachesThem() {
        when(contentClient.getTopicsByIds(any())).thenReturn(List.of(new TopicDto(topicId, "ai")));

        Map<UUID, String> first = resolver.resolve(List.of(topicId));
        Map<UUID, String> second = resolver.resolve(List.of(topicId));

        assertEquals("ai", first.get(topicId));
        assertEquals("ai", second.get(topicId));
        // second call served from cache — content queried only once
        verify(contentClient, times(1)).getTopicsByIds(any());
    }

    @Test
    void resolve_unresolvedId_isAbsent() {
        when(contentClient.getTopicsByIds(any())).thenReturn(List.of());
        assertTrue(resolver.resolve(List.of(topicId)).isEmpty());
    }

    @Test
    void resolveName_returnsResolvedName() {
        when(contentClient.getTopicsByIds(any())).thenReturn(List.of(new TopicDto(topicId, "ml")));
        assertEquals("ml", resolver.resolveName(topicId));
    }

    @Test
    void resolveName_unresolved_returnsNull() {
        when(contentClient.getTopicsByIds(any())).thenReturn(List.of());
        assertNull(resolver.resolveName(topicId));
    }
}
