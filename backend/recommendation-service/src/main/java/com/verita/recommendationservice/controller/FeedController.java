package com.verita.recommendationservice.controller;

import com.verita.api.DiscoveryApi;
import com.verita.model.FeedPage;
import com.verita.recommendationservice.security.SecurityUtils;
import com.verita.recommendationservice.service.feed.FeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequiredArgsConstructor
public class FeedController implements DiscoveryApi {

    private final FeedService feedService;
    private final SecurityUtils securityUtils;

    @Override
    public ResponseEntity<FeedPage> getPersonalFeed(String cursor, Integer size) {
        return ResponseEntity.ok(feedService.getPersonalFeed(securityUtils.getCurrentUserId(), cursor, size));
    }

    @Override
    public ResponseEntity<FeedPage> getTrendingFeed(String topic, String cursor, Integer size) {
        return ResponseEntity.ok(feedService.getTrendingFeed(topic, cursor, size));
    }
}
