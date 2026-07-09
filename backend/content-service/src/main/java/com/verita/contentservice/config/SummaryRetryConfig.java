package com.verita.contentservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

@Configuration
public class SummaryRetryConfig {

    @Bean
    public RetryTemplate summaryRetryTemplate() {
        RetryTemplate retryTemplate = new RetryTemplate();
        retryTemplate.setRetryPolicy(new SimpleRetryPolicy(3));

        ExponentialBackOffPolicy backOffPolicy = new ExponentialBackOffPolicy();
        backOffPolicy.setInitialInterval(2_000L);
        backOffPolicy.setMultiplier(2.0);
        backOffPolicy.setMaxInterval(8_000L);
        retryTemplate.setBackOffPolicy(backOffPolicy);

        return retryTemplate;
    }
}
