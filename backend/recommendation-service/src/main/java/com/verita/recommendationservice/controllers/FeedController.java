package com.verita.recommendationservice.controllers;

import com.verita.api.DiscoveryApi;
import com.verita.model.FeedPage;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;

@RestController
public class FeedController implements DiscoveryApi {

    @Override
    public ResponseEntity<FeedPage> getPersonalFeed(String cursor, Integer size) {
        // TODO: Call Recommendation Engine Service
        return ResponseEntity.ok(new FeedPage(new ArrayList<>(), null));
    }

    @Override
    public ResponseEntity<FeedPage> getTrendingFeed(String tag, String cursor, Integer size) {
        // TODO: Call Trending Algorithm Service
        return ResponseEntity.ok(new FeedPage(new ArrayList<>(), null));
    }
}
