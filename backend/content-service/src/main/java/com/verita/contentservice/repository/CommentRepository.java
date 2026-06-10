package com.verita.contentservice.repository;
import com.verita.contentservice.domain.CommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface CommentRepository extends JpaRepository<CommentEntity, UUID> {
    List<CommentEntity> findByPost_IdAndDeletedFalseOrderByCreatedAtAsc(UUID postId);
    Optional<CommentEntity> findByIdAndDeletedFalse(UUID id);
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE comments SET like_count = (SELECT COUNT(*) FROM votes WHERE target_type = 'COMMENT' AND target_id = :id AND vote_type = 'UPVOTE') WHERE id = :id",
           nativeQuery = true)
    void refreshLikeCount(@Param("id") UUID id);
}
