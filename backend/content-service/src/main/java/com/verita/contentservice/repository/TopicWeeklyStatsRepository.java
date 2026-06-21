package com.verita.contentservice.repository;
import com.verita.contentservice.entity.TopicWeeklyStatsEntity;
import com.verita.contentservice.entity.TopicWeeklyStatsId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
public interface TopicWeeklyStatsRepository extends JpaRepository<TopicWeeklyStatsEntity, TopicWeeklyStatsId> {

    @Modifying
    @Query(value = """
            INSERT INTO topic_weekly_stats (topic_id, week_start, post_count)
            SELECT t.id,
                   date_trunc('week', CURRENT_DATE)::date,
                   COUNT(p.id)
            FROM topics t
            LEFT JOIN post_topics pt ON pt.topic_id = t.id
            LEFT JOIN posts p ON p.id = pt.post_id
                AND p.created_at >= date_trunc('week', CURRENT_TIMESTAMP)
                AND p.deleted = false
            GROUP BY t.id
            ON CONFLICT (topic_id, week_start) DO UPDATE
                SET post_count = EXCLUDED.post_count
            """, nativeQuery = true)
    void upsertCurrentWeekStats();

    @Modifying
    @Query(value = "DELETE FROM topic_weekly_stats WHERE week_start < :cutoff", nativeQuery = true)
    int deleteOlderThan(@Param("cutoff") LocalDate cutoff);
}
