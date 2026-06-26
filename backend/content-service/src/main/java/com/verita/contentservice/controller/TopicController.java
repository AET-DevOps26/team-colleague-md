package com.verita.contentservice.controller;

import com.verita.api.TopicsApi;
import com.verita.contentservice.service.TopicService;
import com.verita.model.FollowerCountDeltaRequest;
import com.verita.model.Topic;
import com.verita.model.TopicCategoryGroup;
import com.verita.model.TopicResponse;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
public class TopicController implements TopicsApi {
    private final TopicService topicService;

    @Override
    public ResponseEntity<List<TopicCategoryGroup>> getTopics() {
        return ResponseEntity.ok(topicService.getAllGrouped());
    }

    @Override
    public ResponseEntity<List<Topic>> getTopicsByIds(List<UUID> ids) {
        return ResponseEntity.ok(topicService.getByIds(ids));
    }

    @Override
    public ResponseEntity<List<TopicResponse>> searchTopics(String q) {
        return ResponseEntity.ok(topicService.search(q));
    }

    @Override
    public ResponseEntity<List<TopicResponse>> getTrendingTopics() {
        return ResponseEntity.ok(topicService.trendingTopics());
    }

    // Service-only endpoint — authenticated by INTERNAL_SERVICE_TOKEN at InternalAuthFilter (ADR-0007).
    @Override
    public ResponseEntity<Void> updateTopicFollowerCounts(FollowerCountDeltaRequest followerCountDeltaRequest) {
        topicService.applyFollowerCountDeltas(followerCountDeltaRequest);
        return ResponseEntity.noContent().build();
    }
}
