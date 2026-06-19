package com.verita.recommendationservice.exception;

/**
 * Raised when a caller exceeds the per-user rate limit. Mapped to HTTP 429 by
 * {@link GlobalExceptionHandler}.
 */
public class RateLimitExceededException extends RuntimeException {

    public RateLimitExceededException(String message) {
        super(message);
    }
}
