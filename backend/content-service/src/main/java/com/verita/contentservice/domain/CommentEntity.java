package com.verita.contentservice.domain;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
@Entity
@Table(name = "comments")
public class CommentEntity extends BaseTimeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private PostEntity post;
    @Column(nullable = false)
    private UUID authorId;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private CommentEntity parentComment;
    @OneToMany(mappedBy = "parentComment", fetch = FetchType.LAZY)
    private Set<CommentEntity> replies = new LinkedHashSet<>();
    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;
    @Column(nullable = false)
    private long likeCount = 0;
    @Column(nullable = false)
    private boolean deleted = false;
    private OffsetDateTime deletedAt;
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public PostEntity getPost() { return post; }
    public void setPost(PostEntity post) { this.post = post; }
    public UUID getAuthorId() { return authorId; }
    public void setAuthorId(UUID authorId) { this.authorId = authorId; }
    public CommentEntity getParentComment() { return parentComment; }
    public void setParentComment(CommentEntity parentComment) { this.parentComment = parentComment; }
    public Set<CommentEntity> getReplies() { return replies; }
    public void setReplies(Set<CommentEntity> replies) { this.replies = replies == null ? new LinkedHashSet<>() : replies; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public long getLikeCount() { return likeCount; }
    public void setLikeCount(long likeCount) { this.likeCount = likeCount; }
    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime deletedAt) { this.deletedAt = deletedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
