package com.verita.contentservice.repository;
import com.verita.contentservice.TagEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface TagRepository extends JpaRepository<TagEntity, UUID> {
    Optional<TagEntity> findByNameIgnoreCase(String name);
    List<TagEntity> findTop10ByOrderByUsageCountDesc();
}
