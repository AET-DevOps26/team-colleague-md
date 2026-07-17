package com.verita.contentservice.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.verita.contentservice.exception.InvalidGenAiOutputException;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.retry.backoff.NoBackOffPolicy;
import org.springframework.retry.support.RetryTemplate;

class SummaryRetryConfigTest {

    @Test
    void invalidGenAiOutputIsNotRetriedByContentService() {
        RetryTemplate template = retryTemplateWithoutDelay();
        AtomicInteger attempts = new AtomicInteger();

        assertThrows(InvalidGenAiOutputException.class, () -> template.execute(context -> {
            attempts.incrementAndGet();
            throw new InvalidGenAiOutputException("invalid output", null);
        }));

        assertEquals(1, attempts.get());
    }

    @Test
    void ordinaryFailuresKeepThreeAttempts() {
        RetryTemplate template = retryTemplateWithoutDelay();
        AtomicInteger attempts = new AtomicInteger();

        assertThrows(RuntimeException.class, () -> template.execute(context -> {
            attempts.incrementAndGet();
            throw new RuntimeException("temporary failure");
        }));

        assertEquals(3, attempts.get());
    }

    private RetryTemplate retryTemplateWithoutDelay() {
        RetryTemplate template = new SummaryRetryConfig().summaryRetryTemplate();
        template.setBackOffPolicy(new NoBackOffPolicy());
        return template;
    }
}
