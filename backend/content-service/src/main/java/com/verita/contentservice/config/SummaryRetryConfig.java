package com.verita.contentservice.config;

import com.verita.contentservice.exception.InvalidGenAiOutputException;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

@Configuration
public class SummaryRetryConfig {

    /**
     * Retries transient Post AI Summary failures while respecting GenAI's exhausted output retry.
     *
     * @return retry template with three transient attempts and exponential backoff
     */
    @Bean
    public RetryTemplate summaryRetryTemplate() {
        RetryTemplate retryTemplate = new RetryTemplate();
        retryTemplate.setRetryPolicy(new SimpleRetryPolicy(
                3,
                Map.of(
                        InvalidGenAiOutputException.class, false,
                        Exception.class, true),
                true));

        ExponentialBackOffPolicy backOffPolicy = new ExponentialBackOffPolicy();
        backOffPolicy.setInitialInterval(2_000L);
        backOffPolicy.setMultiplier(2.0);
        backOffPolicy.setMaxInterval(8_000L);
        retryTemplate.setBackOffPolicy(backOffPolicy);

        return retryTemplate;
    }
}
