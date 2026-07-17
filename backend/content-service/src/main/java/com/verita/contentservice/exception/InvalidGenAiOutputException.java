package com.verita.contentservice.exception;

/** Signals that GenAI exhausted its own retries without producing usable sanitized prose. */
public class InvalidGenAiOutputException extends RuntimeException {

    /**
     * Creates a non-retryable downstream-output failure.
     *
     * @param message safe operational description of the failure
     * @param cause original GenAI HTTP response exception
     */
    public InvalidGenAiOutputException(String message, Throwable cause) {
        super(message, cause);
    }
}
