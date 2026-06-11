package com.verita.contentservice.domain;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;
@Entity
@Table(name = "topic_weekly_stats")
@IdClass(TopicWeeklyStatsId.class)
public class TopicWeeklyStatsEntity {
    @Id
    @Column(name = "topic_id")
    private UUID topicId;
    @Id
    @Column(name = "week_start")
    private LocalDate weekStart;
    @Column(nullable = false)
    private int postCount = 0;
    public UUID getTopicId() { return topicId; }
    public void setTopicId(UUID topicId) { this.topicId = topicId; }
    public LocalDate getWeekStart() { return weekStart; }
    public void setWeekStart(LocalDate weekStart) { this.weekStart = weekStart; }
    public int getPostCount() { return postCount; }
    public void setPostCount(int postCount) { this.postCount = postCount; }
}
