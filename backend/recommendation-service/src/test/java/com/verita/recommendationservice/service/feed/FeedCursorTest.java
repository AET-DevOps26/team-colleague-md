package com.verita.recommendationservice.service.feed;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.verita.model.FeedPage;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class FeedCursorTest {

    /** Ranked list of n posts with strictly descending scores (stable order). */
    private List<ScoredPost> ranked(int n) {
        List<ScoredPost> list = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            list.add(new ScoredPost(UUID.randomUUID(), 100.0 - i));
        }
        return list;
    }

    @Test
    void firstPage_returnsSizeItemsAndACursor() {
        List<ScoredPost> ranked = ranked(10);

        FeedPage page = FeedCursor.paginate(ranked, null, 4);

        assertEquals(4, page.getPostIds().size());
        assertEquals(ranked.get(0).id(), page.getPostIds().get(0));
        assertNotNull(page.getNextCursor());
    }

    @Test
    void cursorContinuation_returnsNextDistinctSlice() {
        List<ScoredPost> ranked = ranked(10);

        FeedPage first = FeedCursor.paginate(ranked, null, 4);
        FeedPage second = FeedCursor.paginate(ranked, first.getNextCursor(), 4);

        assertEquals(ranked.get(4).id(), second.getPostIds().get(0));
        assertEquals(4, second.getPostIds().size());
    }

    @Test
    void lastPage_returnsNullCursor() {
        List<ScoredPost> ranked = ranked(6);

        FeedPage first = FeedCursor.paginate(ranked, null, 4);
        FeedPage last = FeedCursor.paginate(ranked, first.getNextCursor(), 4);

        assertEquals(2, last.getPostIds().size());
        assertNull(last.getNextCursor());
    }

    @Test
    void emptyRanking_returnsEmptyPageWithNullCursor() {
        FeedPage page = FeedCursor.paginate(List.of(), null, 10);

        assertEquals(0, page.getPostIds().size());
        assertNull(page.getNextCursor());
    }

    @Test
    void malformedCursor_restartsFromTop() {
        List<ScoredPost> ranked = ranked(5);

        FeedPage page = FeedCursor.paginate(ranked, "not-a-real-cursor", 3);

        assertEquals(ranked.get(0).id(), page.getPostIds().get(0));
        assertEquals(3, page.getPostIds().size());
    }
}
