package com.verita.contentservice.domain;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.util.UUID;
@Entity
@Table(name = "topics", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
public class TopicEntity extends BaseTimeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false)
    private String name;
    @Column(nullable = false)
    private long usageCount = 0;
    @Column(nullable = false)
    private long postsThisWeek = 0;
    @Column(nullable = false)
    private long postsPrevWeek = 0;
    @Column(nullable = false, precision = 6, scale = 3)
    private BigDecimal activityScore = BigDecimal.ZERO;
    @Column(nullable = false)
    private boolean isHot = false;
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public long getUsageCount() { return usageCount; }
    public void setUsageCount(long usageCount) { this.usageCount = usageCount; }
    public long getPostsThisWeek() { return postsThisWeek; }
    public void setPostsThisWeek(long postsThisWeek) { this.postsThisWeek = postsThisWeek; }
    public long getPostsPrevWeek() { return postsPrevWeek; }
    public void setPostsPrevWeek(long postsPrevWeek) { this.postsPrevWeek = postsPrevWeek; }
    public BigDecimal getActivityScore() { return activityScore; }
    public void setActivityScore(BigDecimal activityScore) { this.activityScore = activityScore; }
    public boolean isHot() { return isHot; }
    public void setHot(boolean isHot) { this.isHot = isHot; }
}
