package com.verita.recommendationservice.service;

import com.verita.model.FeedPage;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * Opaque, stable cursor for feed pagination. A cursor encodes the {@code (score, id)} of the last
 * item returned; the next page is the slice of the ranked snapshot ordered strictly after it
 * (score desc, then id asc). Snapshot ranking is computed elsewhere; this only slices it (ADR-0003).
 */
public final class FeedCursor {

    private FeedCursor() {
    }

    private record Position(double score, UUID id) {
    }

    /** Slices {@code ranked} (already sorted score desc, id asc) into a page after {@code cursor}. */
    public static FeedPage paginate(List<ScoredPost> ranked, String cursor, int size) {
        int start = (cursor == null || cursor.isBlank()) ? 0 : indexAfter(ranked, decode(cursor));
        start = Math.min(start, ranked.size());
        int end = Math.min(start + size, ranked.size());

        List<UUID> postIds = ranked.subList(start, end).stream().map(ScoredPost::id).toList();
        String nextCursor = end < ranked.size() ? encode(ranked.get(end - 1)) : null;
        return new FeedPage(postIds, nextCursor);
    }

    /** First index whose element is strictly after the cursor in (score desc, id asc) order. */
    private static int indexAfter(List<ScoredPost> ranked, Position c) {
        for (int i = 0; i < ranked.size(); i++) {
            ScoredPost p = ranked.get(i);
            boolean after = p.score() < c.score()
                    || (p.score() == c.score() && p.id().compareTo(c.id()) > 0);
            if (after) {
                return i;
            }
        }
        return ranked.size();
    }

    static String encode(ScoredPost last) {
        String raw = Double.toString(last.score()) + ":" + last.id();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private static Position decode(String cursor) {
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            int sep = raw.indexOf(':');
            double score = Double.parseDouble(raw.substring(0, sep));
            UUID id = UUID.fromString(raw.substring(sep + 1));
            return new Position(score, id);
        } catch (Exception e) {
            // A malformed/foreign cursor restarts from the top rather than failing the request.
            return new Position(Double.MAX_VALUE, new UUID(0L, 0L));
        }
    }
}
