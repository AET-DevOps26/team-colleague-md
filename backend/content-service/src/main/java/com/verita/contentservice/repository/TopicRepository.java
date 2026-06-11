package com.verita.contentservice.repository;
import com.verita.contentservice.domain.TopicEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface TopicRepository extends JpaRepository<TopicEntity, UUID> {
    Optional<TopicEntity> findByNameIgnoreCase(String name);
    List<TopicEntity> findTop10ByOrderByUsageCountDesc();
    @Modifying
    @Query("UPDATE TopicEntity t SET t.usageCount = t.usageCount + 1 WHERE t.id = :id")
    void incrementUsageCount(@Param("id") UUID id);
    @Modifying
    @Query(value = "UPDATE topics SET usage_count = GREATEST(0, usage_count - 1) WHERE id = :id", nativeQuery = true)
    void decrementUsageCount(@Param("id") UUID id);

    @Modifying
    @Query(value = """
            UPDATE topics AS t
            SET posts_this_week = (
                    SELECT COUNT(p.id)
                    FROM post_topics pt
                    JOIN posts p ON p.id = pt.post_id
                    WHERE pt.topic_id = t.id
                      AND p.created_at >= NOW() - INTERVAL '7 days'
                      AND p.deleted = false
                ),
                posts_prev_week = (
                    SELECT COUNT(p.id)
                    FROM post_topics pt
                    JOIN posts p ON p.id = pt.post_id
                    WHERE pt.topic_id = t.id
                      AND p.created_at >= NOW() - INTERVAL '14 days'
                      AND p.created_at <  NOW() - INTERVAL '7 days'
                      AND p.deleted = false
                ),
                updated_at = NOW()
            """, nativeQuery = true)
    void refreshRollingCounts();

    @Modifying
    @Query(value = """
            UPDATE topics
            SET activity_score = ROUND(
                    COALESCE(
                        posts_this_week::numeric / NULLIF((SELECT MAX(posts_this_week) FROM topics), 0),
                        0
                    ), 3),
                updated_at = NOW()
            """, nativeQuery = true)
    void normaliseActivityScore();

    @Modifying
    @Query(value = """
            UPDATE topics
            SET is_hot = (
                    posts_this_week >= 20
                    AND (posts_prev_week = 0 OR posts_this_week::float / posts_prev_week > 1.5)
                ),
                updated_at = NOW()
            """, nativeQuery = true)
    void refreshHotFlags();
}
