package com.verita.contentservice.entity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.hibernate.annotations.BatchSize;
@Entity
@Table(name = "posts")
public class PostEntity extends BaseTimeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false)
    private UUID authorId;
    @Column(nullable = false, length = 100)
    private String title;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    @Column(columnDefinition = "TEXT")
    private String excerpt;
    private String coverImageUrl;
    @BatchSize(size = 50)
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "post_source_urls", joinColumns = @JoinColumn(name = "post_id"))
    @Column(name = "source_url", columnDefinition = "TEXT")
    private List<String> sourceUrls = new ArrayList<>();
    @Column(columnDefinition = "TEXT")
    private String contentSummary;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostStatus status = PostStatus.PUBLISHED;
    @Column(nullable = false)
    private long likeCount = 0;
    @Column(nullable = false)
    private long dislikeCount = 0;
    @Column(nullable = false)
    private long commentCount = 0;
    @Column(nullable = false)
    private long viewCount = 0;
    @Column(nullable = false)
    private long saveCount = 0;
    @Column(nullable = false)
    private boolean deleted = false;
    private OffsetDateTime deletedAt;
    @BatchSize(size = 50)
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "post_topics", joinColumns = @JoinColumn(name = "post_id"), inverseJoinColumns = @JoinColumn(name = "topic_id"))
    private Set<TopicEntity> topics = new LinkedHashSet<>();
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getAuthorId() { return authorId; }
    public void setAuthorId(UUID authorId) { this.authorId = authorId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getExcerpt() { return excerpt; }
    public void setExcerpt(String excerpt) { this.excerpt = excerpt; }
    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }
    public List<String> getSourceUrls() { return sourceUrls; }
    // Copy into a mutable list: callers pass immutable Stream.toList() results, which
    // Hibernate cannot manage as an @ElementCollection (mutating ops throw on flush).
    public void setSourceUrls(List<String> sourceUrls) { this.sourceUrls = sourceUrls == null ? new ArrayList<>() : new ArrayList<>(sourceUrls); }
    public String getContentSummary() { return contentSummary; }
    public void setContentSummary(String contentSummary) { this.contentSummary = contentSummary; }
    public PostStatus getStatus() { return status; }
    public void setStatus(PostStatus status) { this.status = status; }
    public long getLikeCount() { return likeCount; }
    public void setLikeCount(long likeCount) { this.likeCount = likeCount; }
    public long getDislikeCount() { return dislikeCount; }
    public void setDislikeCount(long dislikeCount) { this.dislikeCount = dislikeCount; }
    public long getCommentCount() { return commentCount; }
    public void setCommentCount(long commentCount) { this.commentCount = commentCount; }
    public long getViewCount() { return viewCount; }
    public void setViewCount(long viewCount) { this.viewCount = viewCount; }
    public long getSaveCount() { return saveCount; }
    public void setSaveCount(long saveCount) { this.saveCount = saveCount; }
    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime deletedAt) { this.deletedAt = deletedAt; }
    public Set<TopicEntity> getTopics() { return topics; }
    public void setTopics(Set<TopicEntity> topics) { this.topics = topics == null ? new LinkedHashSet<>() : topics; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
