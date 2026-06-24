package com.verita.contentservice.repository;
import com.verita.contentservice.entity.BookmarkEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface BookmarkRepository extends JpaRepository<BookmarkEntity, UUID> {
    Optional<BookmarkEntity> findByUserIdAndPost_Id(UUID userId, UUID postId);
    boolean existsByUserIdAndPost_Id(UUID userId, UUID postId);
    List<BookmarkEntity> findByUserId(UUID userId);
    List<BookmarkEntity> findByUserIdAndPost_IdIn(UUID userId, Collection<UUID> postIds);
    void deleteByUserId(UUID userId);
    long countByPost_Id(UUID postId);
}
