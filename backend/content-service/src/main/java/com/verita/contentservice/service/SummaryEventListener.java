package com.verita.contentservice.service;

import com.verita.contentservice.client.GenAiClient;
import com.verita.contentservice.dto.GenAiSummarizeResponse;
import com.verita.contentservice.entity.SummaryStatus;
import com.verita.contentservice.repository.PostRepository;
import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.retry.support.RetryTemplate;
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
    private final RetryTemplate summaryRetryTemplate;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onSummaryRequested(PostSummaryRequestedEvent event) {
        try {
            GenAiSummarizeResponse response = summaryRetryTemplate.execute(context ->
                    genAiClient.summarize(event.postId(), event.title(), event.content()));
            String summary = String.join("\n", response.summary());
            postRepository.completeSummary(
                    event.postId(), summary, OffsetDateTime.now(), response.model(), SummaryStatus.COMPLETED);
        } catch (Exception e) {
            log.warn("GenAI summarization failed for postId={} after retries: {}", event.postId(), e.getMessage());
            postRepository.updateSummaryStatus(event.postId(), SummaryStatus.FAILED);
        }
    }
}
