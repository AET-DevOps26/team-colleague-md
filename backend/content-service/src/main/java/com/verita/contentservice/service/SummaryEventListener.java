package com.verita.contentservice.service;

import com.verita.contentservice.repository.PostRepository;
import com.verita.contentservice.support.Clients;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class SummaryEventListener {

    private static final Logger log = LoggerFactory.getLogger(SummaryEventListener.class);

    private final PostRepository postRepository;
    private final Clients clients;

    public SummaryEventListener(PostRepository postRepository, Clients clients) {
        this.postRepository = postRepository;
        this.clients = clients;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onSummaryRequested(PostSummaryRequestedEvent event) {
        try {
            String summary = String.join("\n",
                    clients.summarize(event.authorization(), event.postId(), event.title(), event.content())
                           .summary());
            postRepository.updateSummary(event.postId(), summary);
        } catch (Exception e) {
            log.warn("GenAI summarization failed for postId={}: {}", event.postId(), e.getMessage());
        }
    }
}
