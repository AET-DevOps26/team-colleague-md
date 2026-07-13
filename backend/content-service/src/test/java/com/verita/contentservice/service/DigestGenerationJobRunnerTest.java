package com.verita.contentservice.service;

import com.verita.contentservice.entity.DigestGenerationJobEntity;
import com.verita.contentservice.entity.DigestJobStatus;
import com.verita.contentservice.repository.DigestGenerationJobRepository;
import com.verita.model.DigestGenerationResponse;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** How a background digest run settles its job row — the only place its outcome is reported. */
@ExtendWith(MockitoExtension.class)
class DigestGenerationJobRunnerTest {

    private static final LocalDate DATE = LocalDate.of(2026, 7, 11);

    @Mock private DigestGenerationJobRepository jobRepository;
    @Mock private DailyDigestGenerationService digestGenerationService;
    @InjectMocks private DigestGenerationJobRunner runner;

    @Test
    void run_generated_settlesTheJobCompleted() {
        DigestGenerationJobEntity settled = runReturning(
                new DigestGenerationResponse(DigestGenerationResponse.StatusEnum.GENERATED, "Digest generated."));

        assertThat(settled.getStatus()).isEqualTo(DigestJobStatus.COMPLETED);
        assertThat(settled.getMessage()).isEqualTo("Digest generated.");
        assertThat(settled.getFinishedAt()).isNotNull();
    }

    /** SKIPPED is terminal but not a failure — the admin needs to see that nothing was generated. */
    @Test
    void run_skipped_isReportedAsSkippedRatherThanCompleted() {
        DigestGenerationJobEntity settled = runReturning(new DigestGenerationResponse(
                DigestGenerationResponse.StatusEnum.SKIPPED, "Digest already exists for the current Platform Day."));

        assertThat(settled.getStatus()).isEqualTo(DigestJobStatus.SKIPPED);
        assertThat(settled.getMessage()).contains("already exists");
    }

    /** Nothing is waiting on the async thread, so a failure has to land on the job row. */
    @Test
    void run_failure_settlesTheJobFailedWithTheMessage() {
        UUID jobId = UUID.randomUUID();
        DigestGenerationJobEntity job = pendingJob(jobId);
        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));
        when(digestGenerationService.generateForUser(any(), any(LocalDate.class), anyBoolean()))
                .thenThrow(new IllegalStateException("genai down"));

        runner.run(jobId, job.getTargetUserId(), DATE, false);

        DigestGenerationJobEntity settled = captureSettled();
        assertThat(settled.getStatus()).isEqualTo(DigestJobStatus.FAILED);
        assertThat(settled.getMessage()).isEqualTo("genai down");
        assertThat(settled.getFinishedAt()).isNotNull();
    }

    private DigestGenerationJobEntity runReturning(DigestGenerationResponse response) {
        UUID jobId = UUID.randomUUID();
        DigestGenerationJobEntity job = pendingJob(jobId);
        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));
        when(digestGenerationService.generateForUser(job.getTargetUserId(), DATE, false)).thenReturn(response);

        runner.run(jobId, job.getTargetUserId(), DATE, false);

        return captureSettled();
    }

    private DigestGenerationJobEntity pendingJob(UUID jobId) {
        DigestGenerationJobEntity job = new DigestGenerationJobEntity();
        job.setId(jobId);
        job.setTargetUserId(UUID.randomUUID());
        job.setDigestDate(DATE);
        return job;
    }

    private DigestGenerationJobEntity captureSettled() {
        ArgumentCaptor<DigestGenerationJobEntity> captor = ArgumentCaptor.forClass(DigestGenerationJobEntity.class);
        verify(jobRepository).save(captor.capture());
        return captor.getValue();
    }
}
