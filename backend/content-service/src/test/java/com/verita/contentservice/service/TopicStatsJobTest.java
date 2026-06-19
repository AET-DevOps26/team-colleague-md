package com.verita.contentservice.service;

import com.verita.contentservice.repository.TopicRepository;
import com.verita.contentservice.repository.TopicWeeklyStatsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;

public class TopicStatsJobTest {

    @Mock private TopicRepository topicRepository;
    @Mock private TopicWeeklyStatsRepository weeklyStatsRepository;
    @InjectMocks private TopicStatsJob topicStatsJob;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void run_invokesFullRefreshPipeline() {
        topicStatsJob.run();

        verify(weeklyStatsRepository).upsertCurrentWeekStats();
        verify(topicRepository).refreshRollingCounts();
        verify(topicRepository).normaliseActivityScore();
        verify(topicRepository).refreshHotFlags();
        verify(weeklyStatsRepository).deleteOlderThan(LocalDate.now().minusWeeks(8));
    }

    @Test
    void run_purgesWeeklyStatsOlderThanEightWeeks() {
        topicStatsJob.run();

        ArgumentCaptor<LocalDate> cutoff = ArgumentCaptor.forClass(LocalDate.class);
        verify(weeklyStatsRepository).deleteOlderThan(cutoff.capture());
        assertEquals(LocalDate.now().minusWeeks(8), cutoff.getValue());
    }
}
