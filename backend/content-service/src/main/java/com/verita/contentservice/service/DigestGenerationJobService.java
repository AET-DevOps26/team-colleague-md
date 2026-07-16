package com.verita.contentservice.service;

import com.verita.contentservice.entity.DigestGenerationJobEntity;
import com.verita.contentservice.repository.DigestGenerationJobRepository;
import com.verita.model.DigestGenerationJob;
import com.verita.model.DigestJobStatus;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Tracks admin-triggered digest generation (ADR-0020).
 *
 * <p>Generation blocks on a GenAI job plus external news fetches, far past a browser or gateway
 * timeout, so the request thread cannot wait for it. Unlike a post summary — whose status lives on
 * the post row that already exists — a digest row is only written once generation succeeds, so an
 * in-flight or failed run has nothing to hang a status on. This job row is that missing anchor: the
 * trigger persists it as {@code PENDING} and answers with its id, the admin panel polls it, and
 * {@link DigestGenerationJobRunner} settles it off the request thread.
 */
@Service
@RequiredArgsConstructor
public class DigestGenerationJobService {

    private final DigestGenerationJobRepository jobRepository;
    private final DigestGenerationJobRunner runner;
    private final DailyDigestGenerationService digestGenerationService;

    /**
     * Records the run and hands it to the async runner.
     *
     * <p>{@code date} defaults to yesterday: the current Platform Day is still accumulating news, so
     * the day an admin actually wants to (re)generate is almost always the last complete one.
     */
    @Transactional
    public DigestGenerationJob start(UUID userId, LocalDate date, boolean force) {
        DigestGenerationJobEntity job = new DigestGenerationJobEntity();
        job.setTargetUserId(userId);
        job.setDigestDate(date == null ? digestGenerationService.currentPlatformDate().minusDays(1) : date);
        job.setForceRerun(force);
        DigestGenerationJobEntity saved = jobRepository.save(job);

        runner.run(saved.getId(), saved.getTargetUserId(), saved.getDigestDate(), force);
        return toApiModel(saved);
    }

    @Transactional(readOnly = true)
    public DigestGenerationJob getJob(UUID jobId) {
        return jobRepository.findById(jobId)
                .map(DigestGenerationJobService::toApiModel)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Digest job not found"));
    }

    static DigestGenerationJob toApiModel(DigestGenerationJobEntity job) {
        return new DigestGenerationJob()
                .id(job.getId())
                .targetUserId(job.getTargetUserId())
                .digestDate(job.getDigestDate())
                .status(DigestJobStatus.fromValue(job.getStatus().name()))
                .message(job.getMessage())
                .createdAt(job.getCreatedAt())
                .finishedAt(job.getFinishedAt());
    }
}
