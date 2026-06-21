package com.verita.recommendationservice.service.feed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.verita.recommendationservice.client.dto.PostRankDto;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class FeedScoringTest {

    // Default weights/gravity from application.properties.
    private final FeedScoring scoring = new FeedScoring(1.0, 2.0, 0.15, 1.5);

    private PostRankDto post(UUID id, int likes, int comments, int views, OffsetDateTime created) {
        return new PostRankDto(id, likes, comments, views, created);
    }

    @Test
    void rank_sortsByScoreDescThenIdAsc() {
        OffsetDateTime now = OffsetDateTime.now();
        UUID high = UUID.randomUUID();
        UUID low = UUID.randomUUID();

        List<ScoredPost> ranked = scoring.rank(List.of(
                post(low, 0, 0, 0, now),       // engagement 1
                post(high, 50, 10, 100, now))); // much higher engagement, same age

        assertEquals(high, ranked.get(0).id());
        assertEquals(low, ranked.get(1).id());
        assertTrue(ranked.get(0).score() > ranked.get(1).score());
    }

    @Test
    void rank_recencyDecay_newerOutranksOlderAtEqualEngagement() {
        OffsetDateTime now = OffsetDateTime.now();
        UUID fresh = UUID.randomUUID();
        UUID stale = UUID.randomUUID();

        List<ScoredPost> ranked = scoring.rank(List.of(
                post(stale, 10, 2, 20, now.minusDays(3)),
                post(fresh, 10, 2, 20, now)));

        assertEquals(fresh, ranked.get(0).id());
    }

    @Test
    void rank_skipsPostsMissingIdOrTimestamp() {
        OffsetDateTime now = OffsetDateTime.now();
        List<ScoredPost> ranked = scoring.rank(List.of(
                new PostRankDto(null, 1, 1, 1, now),
                new PostRankDto(UUID.randomUUID(), 1, 1, 1, null)));

        assertEquals(0, ranked.size());
    }

    @Test
    void rank_nullCountsTreatedAsZero() {
        OffsetDateTime now = OffsetDateTime.now();
        UUID id = UUID.randomUUID();

        List<ScoredPost> ranked = scoring.rank(List.of(
                new PostRankDto(id, null, null, null, now)));

        assertEquals(1, ranked.size());
        // engagement = 0 + 0 + 0 + 1 = 1; age ~0 → score = 1 / 2^1.5
        assertEquals(1.0 / Math.pow(2.0, 1.5), ranked.get(0).score(), 1e-6);
    }
}
