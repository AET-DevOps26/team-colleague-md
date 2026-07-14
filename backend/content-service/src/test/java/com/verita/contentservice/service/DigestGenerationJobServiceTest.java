package com.verita.contentservice.service;

import com.verita.contentservice.entity.DigestGenerationJobEntity;
import com.verita.contentservice.repository.DigestGenerationJobRepository;
import com.verita.model.DigestGenerationJob;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Admin-triggered digest generation: the job row an admin polls (ADR-0020). */
@ExtendWith(MockitoExtension.class)
class DigestGenerationJobServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 7, 12);

    @Mock private DigestGenerationJobRepository jobRepository;
    @Mock private DigestGenerationJobRunner runner;
    @Mock private DailyDigestGenerationService digestGenerationService;
    @InjectMocks private DigestGenerationJobService jobService;

    private void echoSave() {
        when(jobRepository.save(any())).thenAnswer(inv -> {
            DigestGenerationJobEntity saved = inv.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });
    }

    @Test
    void start_persistsPendingJobAndHandsItToTheRunner() {
        UUID userId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 7, 4);
        echoSave();

        DigestGenerationJob job = jobService.start(userId, date, true);

        assertThat(job.getStatus().getValue()).isEqualTo("PENDING");
        assertThat(job.getDigestDate()).isEqualTo(date);
        assertThat(job.getTargetUserId()).isEqualTo(userId);
        verify(runner).run(job.getId(), userId, date, true);
    }

    @Test
    void start_withoutADate_defaultsToYesterday_becauseTodayIsStillAccumulatingNews() {
        UUID userId = UUID.randomUUID();
        when(digestGenerationService.currentPlatformDate()).thenReturn(TODAY);
        echoSave();

        DigestGenerationJob job = jobService.start(userId, null, false);

        assertThat(job.getDigestDate()).isEqualTo(TODAY.minusDays(1));
        verify(runner).run(job.getId(), userId, TODAY.minusDays(1), false);
    }

    @Test
    void getJob_unknownId_is404() {
        UUID jobId = UUID.randomUUID();
        when(jobRepository.findById(jobId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.getJob(jobId))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }
}
