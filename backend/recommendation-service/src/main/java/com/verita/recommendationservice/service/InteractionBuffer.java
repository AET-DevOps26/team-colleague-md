package com.verita.recommendationservice.service;

import com.verita.recommendationservice.entities.Interaction;
import com.verita.recommendationservice.repository.InteractionRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * Buffers interaction writes in memory and flushes them in batches, so a high-volume
 * stream of behavioral signals turns into a handful of multi-row INSERTs instead of one
 * round-trip per event. Hibernate batches the {@code saveAll} (see hibernate.jdbc.batch_size).
 *
 * <p>The buffer is bounded; on overflow we persist inline as back-pressure rather than
 * dropping the signal. Buffered rows are flushed on a fixed schedule and again on shutdown.
 * The trade-off is durability: a hard crash loses at most one flush interval of un-persisted
 * interactions — acceptable for best-effort analytics signals.
 */
@Component
public class InteractionBuffer {

    private static final Logger log = LoggerFactory.getLogger(InteractionBuffer.class);

    private final InteractionRepository interactionRepository;
    private final BlockingQueue<Interaction> queue;
    private final int batchSize;

    public InteractionBuffer(
            InteractionRepository interactionRepository,
            @Value("${recommendation.interactions.buffer.capacity:10000}") int capacity,
            @Value("${recommendation.interactions.buffer.batch-size:100}") int batchSize) {
        this.interactionRepository = interactionRepository;
        this.queue = new LinkedBlockingQueue<>(capacity);
        this.batchSize = batchSize;
    }

    /**
     * Non-blocking enqueue. If the buffer is saturated the interaction is persisted inline
     * instead of being discarded.
     */
    public void add(Interaction interaction) {
        if (!queue.offer(interaction)) {
            log.warn("Interaction buffer full ({} items); persisting inline", queue.size());
            try {
                interactionRepository.save(interaction);
            } catch (Exception ex) {
                log.error("Failed to persist interaction inline after buffer overflow", ex);
            }
        }
    }

    /**
     * Drains the buffer and writes it out in batches of at most {@code batchSize}.
     */
    @Scheduled(fixedDelayString = "${recommendation.interactions.buffer.flush-interval-ms:2000}")
    public void flush() {
        List<Interaction> batch = new ArrayList<>(batchSize);
        while (queue.drainTo(batch, batchSize) > 0) {
            persistBatch(batch);
            batch.clear();
        }
    }

    @PreDestroy
    public void flushOnShutdown() {
        List<Interaction> remaining = new ArrayList<>();
        queue.drainTo(remaining);
        if (!remaining.isEmpty()) {
            log.info("Flushing {} buffered interactions on shutdown", remaining.size());
            persistBatch(remaining);
        }
    }

    private void persistBatch(List<Interaction> batch) {
        try {
            // saveAll runs in its own transaction; with JDBC batching enabled this emits
            // multi-row INSERTs rather than one statement per row.
            interactionRepository.saveAll(batch);
        } catch (Exception ex) {
            // A failed batch must not kill the scheduler thread or the shutdown hook.
            log.error("Failed to persist interaction batch of size {}", batch.size(), ex);
        }
    }
}
