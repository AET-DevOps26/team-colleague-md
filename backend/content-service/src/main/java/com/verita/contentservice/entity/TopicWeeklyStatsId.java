package com.verita.contentservice.entity;
import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;
public class TopicWeeklyStatsId implements Serializable {
    private UUID topicId;
    private LocalDate weekStart;
    public TopicWeeklyStatsId() {}
    public TopicWeeklyStatsId(UUID topicId, LocalDate weekStart) {
        this.topicId = topicId;
        this.weekStart = weekStart;
    }
    public UUID getTopicId() { return topicId; }
    public LocalDate getWeekStart() { return weekStart; }
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TopicWeeklyStatsId that)) return false;
        return Objects.equals(topicId, that.topicId) && Objects.equals(weekStart, that.weekStart);
    }
    @Override
    public int hashCode() { return Objects.hash(topicId, weekStart); }
}
