package com.verita.contentservice.service;

import com.verita.contentservice.domain.TopicCategoryEntity;
import com.verita.contentservice.domain.TopicEntity;
import com.verita.contentservice.repository.TopicCategoryRepository;
import com.verita.contentservice.repository.TopicRepository;
import com.verita.model.FollowerCountDeltaRequest;
import com.verita.model.TopicCategoryGroup;
import com.verita.model.TopicResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TopicService {

    private final TopicRepository topicRepository;
    private final TopicCategoryRepository categoryRepository;

    public TopicService(TopicRepository topicRepository, TopicCategoryRepository categoryRepository) {
        this.topicRepository = topicRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<TopicResponse> trendingTopics() {
        return topicRepository.findTop10ByOrderByTotalPostCountDesc().stream()
                .map(this::toTopicResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TopicCategoryGroup> getAllGrouped() {
        List<TopicEntity> topics = topicRepository.findAllOrderedByCategoryAndTopicSort();
        Map<String, TopicCategoryEntity> categoryById = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(TopicCategoryEntity::getId, c -> c));

        // Accumulate maintaining the SQL-provided order (category sort → topic sort)
        Map<String, List<TopicEntity>> grouped = new LinkedHashMap<>();
        for (TopicEntity t : topics) {
            String key = t.getCategoryId() != null ? t.getCategoryId() : "";
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(t);
        }

        return grouped.entrySet().stream()
                .map(e -> {
                    TopicCategoryEntity cat = categoryById.get(e.getKey());
                    TopicCategoryGroup group = new TopicCategoryGroup();
                    if (cat != null) {
                        group.id(cat.getId()).label(cat.getLabel()).sortOrder(cat.getSortOrder());
                    }
                    group.topics(e.getValue().stream().map(this::toTopicResponse).toList());
                    return group;
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TopicResponse> search(String q) {
        return topicRepository.searchByQuery(q).stream()
                .map(this::toTopicResponse)
                .toList();
    }

    @Transactional
    public void applyFollowerCountDeltas(FollowerCountDeltaRequest request) {
        Map<String, Integer> deltas = request.getDeltas();
        if (deltas == null || deltas.isEmpty()) return;
        deltas.forEach((name, delta) -> {
            if (delta != null && delta != 0) topicRepository.applyFollowerCountDelta(name, delta);
        });
    }

    private TopicResponse toTopicResponse(TopicEntity t) {
        return new TopicResponse()
                .id(t.getId())
                .name(t.getName())
                .displayName(t.getDisplayName())
                .categoryId(t.getCategoryId())
                .sortOrder(t.getSortOrder())
                .totalPostCount(t.getTotalPostCount())
                .postsThisWeek(t.getPostsThisWeek())
                .postsPrevWeek(t.getPostsPrevWeek())
                .activityScore(t.getActivityScore())
                .isHot(t.isHot())
                .followerCount(t.getFollowerCount());
    }
}
