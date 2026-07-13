package com.verita.contentservice.service;

import com.verita.contentservice.entity.DigestGenerationJobEntity;
import com.verita.contentservice.entity.DigestJobStatus;
import com.verita.contentservice.repository.DigestGenerationJobRepository;
import com.verita.model.DigestGenerationResponse;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Runs one admin-triggered digest generation off the request thread and settles its job row.
 *
 * <p>Separate from {@link DigestGenerationJobService} on purpose: {@code @Async} is proxy-based, so a
 * call from the same bean that persists the job would bypass the proxy and block the request thread.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DigestGenerationJobRunner {

    private final DigestGenerationJobRepository jobRepository;
    private final DailyDigestGenerationService digestGenerationService;

    @Async
    public void run(UUID jobId, UUID userId, LocalDate date, boolean force) {
        try {
            DigestGenerationResponse response = digestGenerationService.generateForUser(userId, date, force);
            // SKIPPED is not a failure: the user already had a digest for that day and force was off.
            DigestJobStatus status = response.getStatus() == DigestGenerationResponse.StatusEnum.SKIPPED
                    ? DigestJobStatus.SKIPPED
                    : DigestJobStatus.COMPLETED;
            settle(jobId, status, response.getMessage());
            log.info("Admin digest generation {} for userId={} date={} (force={})",
                    status, userId, date, force);
        } catch (Exception e) {
            // Nobody is waiting on this thread, so the job row is the only place the failure can be
            // reported — the admin panel polls it and shows the message.
            settle(jobId, DigestJobStatus.FAILED, e.getMessage());
            log.warn("Admin digest generation failed for userId={} date={}: {}", userId, date, e.getMessage());
        }
    }

    private void settle(UUID jobId, DigestJobStatus status, String message) {
        DigestGenerationJobEntity job = jobRepository.findById(jobId).orElse(null);
        if (job == null) {
            return;
        }
        job.setStatus(status);
        job.setMessage(message);
        job.setFinishedAt(OffsetDateTime.now());
        jobRepository.save(job);
    }
}
