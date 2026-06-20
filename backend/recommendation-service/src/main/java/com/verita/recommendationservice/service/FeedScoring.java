package com.verita.recommendationservice.service;

import com.verita.recommendationservice.client.dto.PostRankDto;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Engagement + recency scoring shared by the trending and personal feeds (ADR-0003):
 * <pre>score = (w_like·likes + w_comment·comments + w_view·views + 1) / (ageHours + 2)^gravity</pre>
 * Weights and gravity are config-tunable. Comments outweigh likes (higher-effort signal); views
 * are discounted; the {@code +1} keeps fresh zero-engagement posts ranking by recency.
 */
@Component
public class FeedScoring {

    private final double likeWeight;
    private final double commentWeight;
    private final double viewWeight;
    private final double gravity;

    public FeedScoring(
            @Value("${recommendation.trending.weight.like:1.0}") double likeWeight,
            @Value("${recommendation.trending.weight.comment:2.0}") double commentWeight,
            @Value("${recommendation.trending.weight.view:0.15}") double viewWeight,
            @Value("${recommendation.trending.gravity:1.5}") double gravity) {
        this.likeWeight = likeWeight;
        this.commentWeight = commentWeight;
        this.viewWeight = viewWeight;
        this.gravity = gravity;
    }

    public double score(PostRankDto post, Instant now) {
        double engagement = likeWeight * post.likes()
                + commentWeight * post.comments()
                + viewWeight * post.views()
                + 1.0;
        double ageHours = Math.max(0.0, Duration.between(post.createdAt().toInstant(), now).toMinutes() / 60.0);
        return engagement / Math.pow(ageHours + 2.0, gravity);
    }

    /** Scores and sorts posts by score desc, then id asc (stable ordering for the cursor). */
    public List<ScoredPost> rank(Collection<PostRankDto> posts) {
        Instant now = Instant.now();
        return posts.stream()
                .filter(p -> p.id() != null && p.createdAt() != null)
                .map(p -> new ScoredPost(p.id(), score(p, now)))
                .sorted(Comparator.comparingDouble(ScoredPost::score).reversed()
                        .thenComparing(ScoredPost::id))
                .toList();
    }
}
