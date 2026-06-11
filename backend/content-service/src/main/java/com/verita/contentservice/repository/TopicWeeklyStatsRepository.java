package com.verita.contentservice.repository;
import com.verita.contentservice.domain.TopicWeeklyStatsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.UUID;
public interface TopicWeeklyStatsRepository extends JpaRepository<TopicWeeklyStatsEntity, UUID> {

    @Modifying
    @Query(value = """
            INSERT INTO topic_weekly_stats (id, topic_id, week_start, post_count, created_at, updated_at)
            SELECT gen_random_uuid(),
                   t.id,
                   date_trunc('week', CURRENT_DATE)::date,
                   COUNT(p.id),
                   NOW(),
                   NOW()
            FROM topics t
            LEFT JOIN post_topics pt ON pt.topic_id = t.id
            LEFT JOIN posts p ON p.id = pt.post_id
                AND p.created_at >= date_trunc('week', CURRENT_TIMESTAMP)
                AND p.deleted = false
            GROUP BY t.id
            ON CONFLICT (topic_id, week_start) DO UPDATE
                SET post_count = EXCLUDED.post_count,
                    updated_at = NOW()
            """, nativeQuery = true)
    void upsertCurrentWeekStats();

    @Modifying
    @Query(value = "DELETE FROM topic_weekly_stats WHERE week_start < :cutoff", nativeQuery = true)
    int deleteOlderThan(@Param("cutoff") LocalDate cutoff);
}
