package com.verita.contentservice.entity;

/**
 * Lifecycle of an admin-triggered digest generation run, mirroring {@link SummaryStatus} so the
 * admin panel can present both the same way.
 *
 * <p>{@code SKIPPED} is terminal but is not a failure: the user already had a digest for that day
 * and {@code force} was off, so nothing was generated.
 */
public enum DigestJobStatus {
    PENDING,
    COMPLETED,
    SKIPPED,
    FAILED
}
