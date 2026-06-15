package com.verita.recommendationservice.controllers;

import com.verita.api.DiscoveryApi;
import com.verita.model.FeedPage;
import com.verita.recommendationservice.service.FeedService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
public class FeedController implements DiscoveryApi {

    private final FeedService feedService;

    public FeedController(FeedService feedService) {
        this.feedService = feedService;
    }

    @Override
    public ResponseEntity<FeedPage> getPersonalFeed(String cursor, Integer size) {
        return ResponseEntity.ok(feedService.getPersonalFeed(cursor, size));
    }

    @Override
    public ResponseEntity<FeedPage> getTrendingFeed(String tag, String cursor, Integer size) {
        return ResponseEntity.ok(feedService.getTrendingFeed(tag, cursor, size));
    }
}
