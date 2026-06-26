package com.verita.userservice.exception;

import java.util.UUID;

public class DeleteUserRecommendationException extends RuntimeException {
    private final UUID userId;
    private final String downstreamService;
    private final String endpoint;
    private final Integer downstreamStatus;
    private final String downstreamResponseBody;

    public DeleteUserRecommendationException(UUID userId, String downstreamService, String endpoint,
                                             Integer downstreamStatus, String downstreamResponseBody,
                                             Throwable cause) {
        super(message(userId, downstreamService, downstreamStatus), cause);
        this.userId = userId;
        this.downstreamService = downstreamService;
        this.endpoint = endpoint;
        this.downstreamStatus = downstreamStatus;
        this.downstreamResponseBody = downstreamResponseBody;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getDownstreamService() {
        return downstreamService;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public Integer getDownstreamStatus() {
        return downstreamStatus;
    }

    public String getDownstreamResponseBody() {
        return downstreamResponseBody;
    }

    private static String message(UUID userId, String downstreamService, Integer downstreamStatus) {
        String status = downstreamStatus == null ? "unavailable" : downstreamStatus.toString();
        return "Failed to delete " + downstreamService + " data for user " + userId
                + " (downstreamStatus=" + status + ")";
    }
}
