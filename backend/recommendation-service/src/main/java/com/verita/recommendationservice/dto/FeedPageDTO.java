package com.verita.recommendationservice.dto;

import java.util.List;
import java.util.UUID;

class FeedPage {
    private List<UUID> postIds;
    private String nextCursor;

    public FeedPage(List<UUID> postIds, String nextCursor) {
        this.postIds = postIds;
        this.nextCursor = nextCursor;
    }

    public List<UUID> getPostIds() { return postIds; }
    public void setPostIds(List<UUID> postIds) { this.postIds = postIds; }
    public String getNextCursor() { return nextCursor; }
    public void setNextCursor(String nextCursor) { this.nextCursor = nextCursor; }
}
