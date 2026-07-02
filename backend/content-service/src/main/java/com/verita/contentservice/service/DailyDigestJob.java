package com.verita.contentservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DailyDigestJob {
    private final DailyDigestGenerationService generationService;

    @Scheduled(cron = "${app.digest.cron:0 30 18 * * *}")
    public void run() {
        log.info("Daily digest generation started");
        generationService.generateDueDigests();
        log.info("Daily digest generation complete");
    }
}
