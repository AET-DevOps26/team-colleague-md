package com.verita.recommendationservice.service.feed;

import java.util.UUID;

/** A post with its computed feed ranking score. Ordering is score desc, then id asc (stable). */
public record ScoredPost(UUID id, double score) {
}
