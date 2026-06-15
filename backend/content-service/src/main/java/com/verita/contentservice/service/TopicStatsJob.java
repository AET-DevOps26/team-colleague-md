package com.verita.contentservice.service;

import com.verita.contentservice.repository.TopicRepository;
import com.verita.contentservice.repository.TopicWeeklyStatsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
public class TopicStatsJob {

    private static final Logger log = LoggerFactory.getLogger(TopicStatsJob.class);

    private final TopicRepository topicRepository;
    private final TopicWeeklyStatsRepository weeklyStatsRepository;

    public TopicStatsJob(TopicRepository topicRepository, TopicWeeklyStatsRepository weeklyStatsRepository) {
        this.topicRepository = topicRepository;
        this.weeklyStatsRepository = weeklyStatsRepository;
    }

    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void run() {
        log.info("Topic stats refresh started");
        weeklyStatsRepository.upsertCurrentWeekStats();
        topicRepository.refreshRollingCounts();
        topicRepository.normaliseActivityScore();
        topicRepository.refreshHotFlags();
        int purged = weeklyStatsRepository.deleteOlderThan(LocalDate.now().minusWeeks(8));
        log.info("Topic stats refresh complete; purged {} old weekly-stats rows", purged);
    }
}
