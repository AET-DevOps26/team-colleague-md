package com.verita.contentservice.service;

import com.verita.contentservice.domain.TopicCategoryEntity;
import com.verita.contentservice.domain.TopicEntity;
import com.verita.contentservice.repository.TopicCategoryRepository;
import com.verita.contentservice.repository.TopicRepository;
import com.verita.model.FollowerCountDeltaRequest;
import com.verita.model.Topic;
import com.verita.model.TopicCategoryGroup;
import com.verita.model.TopicResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class TopicServiceTest {

    @Mock private TopicRepository topicRepository;
    @Mock private TopicCategoryRepository categoryRepository;
    @InjectMocks private TopicService topicService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    private TopicEntity topic(String name, String categoryId, int sortOrder) {
        TopicEntity t = new TopicEntity();
        t.setId(UUID.randomUUID());
        t.setName(name);
        t.setDisplayName(name);
        t.setCategoryId(categoryId);
        t.setSortOrder(sortOrder);
        return t;
    }

    private TopicCategoryEntity category(String id, String label, int sortOrder) {
        TopicCategoryEntity c = new TopicCategoryEntity();
        c.setId(id);
        c.setLabel(label);
        c.setSortOrder(sortOrder);
        return c;
    }

    @Test
    void trendingTopics_mapsEntitiesToResponses() {
        when(topicRepository.findTop10ByOrderByTotalPostCountDesc())
                .thenReturn(List.of(topic("java", "tech", 0)));

        List<TopicResponse> result = topicService.trendingTopics();

        assertEquals(1, result.size());
        assertEquals("java", result.get(0).getName());
    }

    @Test
    void search_mapsEntitiesToResponses() {
        when(topicRepository.searchByQuery("ja")).thenReturn(List.of(topic("java", "tech", 0)));

        List<TopicResponse> result = topicService.search("ja");

        assertEquals(1, result.size());
        assertEquals("java", result.get(0).getName());
    }

    @Test
    void getByIds_mapsToMinimalTopics() {
        TopicEntity java = topic("java", "tech", 0);
        TopicEntity go = topic("go", "tech", 1);
        List<UUID> ids = List.of(java.getId(), go.getId());
        when(topicRepository.findAllById(ids)).thenReturn(List.of(java, go));

        List<Topic> result = topicService.getByIds(ids);

        assertEquals(2, result.size());
        assertEquals(java.getId(), result.get(0).getId());
        assertEquals("java", result.get(0).getName());
    }

    @Test
    void getByIds_unknownIdsAreOmitted() {
        TopicEntity java = topic("java", "tech", 0);
        UUID missing = UUID.randomUUID();
        List<UUID> ids = List.of(java.getId(), missing);
        // Repository returns only the topics that exist.
        when(topicRepository.findAllById(ids)).thenReturn(List.of(java));

        List<Topic> result = topicService.getByIds(ids);

        assertEquals(1, result.size());
        assertEquals(java.getId(), result.get(0).getId());
    }

    @Test
    void getAllGrouped_groupsByCategoryPreservingOrder() {
        TopicEntity t1 = topic("java", "tech", 0);
        TopicEntity t2 = topic("spring", "tech", 1);
        TopicEntity t3 = topic("politics", "news", 0);
        when(topicRepository.findAllOrderedByCategoryAndTopicSort()).thenReturn(List.of(t1, t2, t3));
        when(categoryRepository.findAll())
                .thenReturn(List.of(category("tech", "Technology", 0), category("news", "News", 1)));

        List<TopicCategoryGroup> groups = topicService.getAllGrouped();

        assertEquals(2, groups.size());
        assertEquals("Technology", groups.get(0).getLabel());
        assertEquals(2, groups.get(0).getTopics().size());
        assertEquals("News", groups.get(1).getLabel());
        assertEquals(1, groups.get(1).getTopics().size());
    }

    @Test
    void applyFollowerCountDeltas_validDeltas_appliesEach() {
        FollowerCountDeltaRequest request = new FollowerCountDeltaRequest().deltas(Map.of("java", 1, "go", -1));

        topicService.applyFollowerCountDeltas(request);

        verify(topicRepository).applyFollowerCountDelta("java", 1);
        verify(topicRepository).applyFollowerCountDelta("go", -1);
    }

    @Test
    void applyFollowerCountDeltas_invalidDelta_throwsIllegalArgument() {
        FollowerCountDeltaRequest request = new FollowerCountDeltaRequest().deltas(Map.of("java", 5));

        assertThrows(IllegalArgumentException.class, () -> topicService.applyFollowerCountDeltas(request));
    }

    @Test
    void applyFollowerCountDeltas_emptyDeltas_isNoOp() {
        FollowerCountDeltaRequest request = new FollowerCountDeltaRequest().deltas(Map.of());

        topicService.applyFollowerCountDeltas(request);

        verify(topicRepository, never()).applyFollowerCountDelta(anyString(), anyInt());
    }
}
