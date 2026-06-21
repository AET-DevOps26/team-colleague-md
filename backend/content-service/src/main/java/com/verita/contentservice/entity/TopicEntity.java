package com.verita.contentservice.entity;
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
    @Column(nullable = false, length = 50)
    private String name;
    @Column(length = 100)
    private String displayName;
    @Column(name = "category_id", length = 50)
    private String categoryId;
    @Column(nullable = false)
    private int sortOrder = 0;
    @Column(nullable = false)
    private int totalPostCount = 0;
    @Column(nullable = false)
    private int postsThisWeek = 0;
    @Column(nullable = false)
    private int postsPrevWeek = 0;
    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal activityScore = BigDecimal.ZERO;
    @Column(nullable = false)
    private boolean isHot = false;
    @Column(nullable = false)
    private int followerCount = 0;
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public int getTotalPostCount() { return totalPostCount; }
    public void setTotalPostCount(int totalPostCount) { this.totalPostCount = totalPostCount; }
    public int getPostsThisWeek() { return postsThisWeek; }
    public void setPostsThisWeek(int postsThisWeek) { this.postsThisWeek = postsThisWeek; }
    public int getPostsPrevWeek() { return postsPrevWeek; }
    public void setPostsPrevWeek(int postsPrevWeek) { this.postsPrevWeek = postsPrevWeek; }
    public BigDecimal getActivityScore() { return activityScore; }
    public void setActivityScore(BigDecimal activityScore) { this.activityScore = activityScore; }
    public boolean isHot() { return isHot; }
    public void setHot(boolean isHot) { this.isHot = isHot; }
    public int getFollowerCount() { return followerCount; }
    public void setFollowerCount(int followerCount) { this.followerCount = followerCount; }
}
