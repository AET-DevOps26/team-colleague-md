package com.verita.contentservice.repository;
import com.verita.contentservice.CommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface CommentRepository extends JpaRepository<CommentEntity, UUID> {
    List<CommentEntity> findByPost_IdAndDeletedFalseOrderByCreatedAtAsc(UUID postId);
    Optional<CommentEntity> findByIdAndDeletedFalse(UUID id);
}
