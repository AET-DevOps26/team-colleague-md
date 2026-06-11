package com.verita.contentservice.repository;
import com.verita.contentservice.domain.TopicCategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface TopicCategoryRepository extends JpaRepository<TopicCategoryEntity, String> {
    List<TopicCategoryEntity> findAllByOrderBySortOrderAsc();
}
