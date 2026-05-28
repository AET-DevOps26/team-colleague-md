package com.verita.userservice.repository;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.time.OffsetDateTime;
import com.verita.model.UserRole;
import com.verita.model.DigestFrequency;

@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String username;

    private String displayName;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password; // hashed password

    private String avatarUrl;

    @Column(length = 1000)
    private String bio;

    private String website;
    private String organization;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_expertise", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "expertise")
    private List<String> expertiseAreas = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role = UserRole.USER;

    private Boolean isBanned = false;
    private Integer postCount = 0;
    private Integer followerCount = 0;
    private Integer followingCount = 0;
    private Integer likeReceivedCount = 0;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    // Preferences
    @Enumerated(EnumType.STRING)
    private DigestFrequency digestFrequency = DigestFrequency.WEEKLY;

    private Boolean showBookmarks = true;

    @PrePersist
    public void prePersist() {
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }
    public String getOrganization() { return organization; }
    public void setOrganization(String organization) { this.organization = organization; }
    public List<String> getExpertiseAreas() { return expertiseAreas; }
    public void setExpertiseAreas(List<String> expertiseAreas) { this.expertiseAreas = expertiseAreas; }
    public UserRole getRole() { return role; }
    public void setRole(UserRole role) { this.role = role; }
    public Boolean getIsBanned() { return isBanned; }
    public void setIsBanned(Boolean isBanned) { this.isBanned = isBanned; }
    public Integer getPostCount() { return postCount; }
    public void setPostCount(Integer postCount) { this.postCount = postCount; }
    public Integer getFollowerCount() { return followerCount; }
    public void setFollowerCount(Integer followerCount) { this.followerCount = followerCount; }
    public Integer getFollowingCount() { return followingCount; }
    public void setFollowingCount(Integer followingCount) { this.followingCount = followingCount; }
    public Integer getLikeReceivedCount() { return likeReceivedCount; }
    public void setLikeReceivedCount(Integer likeReceivedCount) { this.likeReceivedCount = likeReceivedCount; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public DigestFrequency getDigestFrequency() { return digestFrequency; }
    public void setDigestFrequency(DigestFrequency digestFrequency) { this.digestFrequency = digestFrequency; }
    public Boolean getShowBookmarks() { return showBookmarks; }
    public void setShowBookmarks(Boolean showBookmarks) { this.showBookmarks = showBookmarks; }
}

