package com.verita.contentservice.service;

import com.verita.contentservice.client.UserClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Forwards {@link UserStatsDeltaEvent}s to user-service after the emitting transaction commits, off the
 * request thread. This keeps the synchronous cross-service HTTP call (and its multi-second timeout) out
 * of the DB transaction so a slow or unreachable user-service cannot stall post/like flows (issue #178,
 * ADR-0007). The call itself is best-effort — {@link UserClient} swallows downstream failures.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserStatsDeltaEventListener {

    private final UserClient userClient;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onUserStatsDelta(UserStatsDeltaEvent event) {
        userClient.applyUserStatsDelta(event.authorId(), event.postCountDelta(), event.likeReceivedCountDelta());
    }
}
