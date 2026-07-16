package com.verita.contentservice.service;

import java.util.UUID;

/**
 * Signals a change to an author's aggregate profile counts (issue #178). Published inside the request
 * transaction and forwarded to user-service after commit, so the external write-back never blocks the
 * publish/like flow's DB transaction (ADR-0007).
 */
public record UserStatsDeltaEvent(UUID authorId, int postCountDelta, int likeReceivedCountDelta) {}
