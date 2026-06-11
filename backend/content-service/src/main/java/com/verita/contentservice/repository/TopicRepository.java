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
}
