package com.verita.contentservice.service;

import com.verita.contentservice.client.GenAiClient;
import com.verita.contentservice.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class SummaryEventListener {

    private final PostRepository postRepository;
    private final GenAiClient genAiClient;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onSummaryRequested(PostSummaryRequestedEvent event) {
        try {
            String summary = String.join("\n",
                    genAiClient.summarize(event.authorization(), event.postId(), event.title(), event.content())
                           .summary());
            postRepository.updateSummary(event.postId(), summary);
        } catch (Exception e) {
            log.warn("GenAI summarization failed for postId={}: {}", event.postId(), e.getMessage());
        }
    }
}
