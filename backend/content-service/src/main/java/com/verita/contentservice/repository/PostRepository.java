package com.verita.contentservice.repository;
import com.verita.contentservice.PostEntity;
import com.verita.contentservice.PostStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
public interface PostRepository extends JpaRepository<PostEntity, UUID> {
    Page<PostEntity> findByDeletedFalseAndStatusOrderByCreatedAtDesc(PostStatus status, Pageable pageable);
    Page<PostEntity> findByDeletedFalseAndStatusAndTags_NameIgnoreCaseOrderByCreatedAtDesc(PostStatus status, String tagName, Pageable pageable);
    Page<PostEntity> findByDeletedFalseAndAuthorIdAndStatusOrderByCreatedAtDesc(UUID authorId, PostStatus status, Pageable pageable);
    Optional<PostEntity> findByIdAndDeletedFalse(UUID id);
    @Query("select p from PostEntity p where p.deleted = false and p.status = 'PUBLISHED' and (lower(p.title) like lower(concat('%', :query, '%')) or lower(p.content) like lower(concat('%', :query, '%')))")
    Page<PostEntity> searchPublished(String query, Pageable pageable);
    List<PostEntity> findByIdInAndDeletedFalse(Set<UUID> ids);
    @Query(value = "select p from PostEntity p where p.id in (select b.post.id from BookmarkEntity b where b.userId = :userId) and p.deleted = false and p.status = 'PUBLISHED' order by p.createdAt desc",
           countQuery = "select count(p) from PostEntity p where p.id in (select b.post.id from BookmarkEntity b where b.userId = :userId) and p.deleted = false and p.status = 'PUBLISHED'")
    Page<PostEntity> findBookmarkedPublishedPostsByUserId(@Param("userId") UUID userId, Pageable pageable);
    @Query(value = "select p from PostEntity p where p.id in (select v.targetId from VoteEntity v where v.userId = :userId and v.targetType = 'POST' and v.voteType = 'UPVOTE') and p.deleted = false and p.status = 'PUBLISHED' order by p.createdAt desc",
           countQuery = "select count(p) from PostEntity p where p.id in (select v.targetId from VoteEntity v where v.userId = :userId and v.targetType = 'POST' and v.voteType = 'UPVOTE') and p.deleted = false and p.status = 'PUBLISHED'")
    Page<PostEntity> findLikedPublishedPostsByUserId(@Param("userId") UUID userId, Pageable pageable);
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE posts SET like_count = (SELECT COUNT(*) FROM votes WHERE target_type = 'POST' AND target_id = :id AND vote_type = 'UPVOTE'), dislike_count = (SELECT COUNT(*) FROM votes WHERE target_type = 'POST' AND target_id = :id AND vote_type = 'DOWNVOTE') WHERE id = :id",
           nativeQuery = true)
    void refreshVoteCounts(@Param("id") UUID id);
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE posts SET save_count = (SELECT COUNT(*) FROM bookmarks WHERE post_id = :id) WHERE id = :id",
           nativeQuery = true)
    void refreshSaveCount(@Param("id") UUID id);
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update PostEntity p set p.commentCount = p.commentCount + 1 where p.id = :id")
    void incrementCommentCount(@Param("id") UUID id);
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update PostEntity p set p.viewCount = p.viewCount + 1 where p.id = :id")
    void incrementViewCount(@Param("id") UUID id);
}
