package com.verita.contentservice.repository;
import com.verita.contentservice.PostEntity;
import com.verita.contentservice.PostStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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
}
