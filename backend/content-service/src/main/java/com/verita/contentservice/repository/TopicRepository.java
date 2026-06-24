package com.verita.contentservice.repository;
import com.verita.contentservice.entity.TopicEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
public interface TopicRepository extends JpaRepository<TopicEntity, UUID> {
    Optional<TopicEntity> findByNameIgnoreCase(String name);
    List<TopicEntity> findTop10ByOrderByTotalPostCountDesc();
    @Modifying
    @Query("UPDATE TopicEntity t SET t.totalPostCount = t.totalPostCount + 1 WHERE t.id = :id")
    void incrementTotalPostCount(@Param("id") UUID id);
    @Modifying
    @Query(value = "UPDATE topics SET total_post_count = GREATEST(0, total_post_count - 1) WHERE id = :id", nativeQuery = true)
    void decrementTotalPostCount(@Param("id") UUID id);

    @Query(value = """
            SELECT t.* FROM topics t
            LEFT JOIN topic_categories c ON c.id = t.category_id
            ORDER BY COALESCE(c.sort_order, 9999) ASC, t.sort_order ASC
            """, nativeQuery = true)
    List<TopicEntity> findAllOrderedByCategoryAndTopicSort();

    @Query(value = """
            SELECT * FROM topics
            WHERE name ILIKE '%' || :q || '%'
               OR display_name ILIKE '%' || :q || '%'
            ORDER BY total_post_count DESC
            LIMIT 20
            """, nativeQuery = true)
    List<TopicEntity> searchByQuery(@Param("q") String q);

    @Modifying
    @Transactional
    @Query("UPDATE TopicEntity t SET t.followerCount = GREATEST(0, t.followerCount + :delta) WHERE t.name = :name")
    int applyFollowerCountDelta(@Param("name") String name, @Param("delta") int delta);

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
