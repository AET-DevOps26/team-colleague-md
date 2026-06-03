import javax.persistence.*;
import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId; // The user receiving the notification

    @Column(nullable = false)
    private String type; // COMMENT, LIKE, VERIFICATION_APPROVED, etc.

    @Column(nullable = false)
    private String content;

    @Column(name = "related_post_id")
    private UUID relatedPostId;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at", nullable = false)
    private Date createdAt = new Date();

    // Getters and Setters omitted for brevity
}

@Entity
@Table(name = "interactions")
public class Interaction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId; // Populated if authenticated

    @Column(name = "post_id", nullable = false)
    private UUID postId;

    @Column(name = "interaction_type", nullable = false)
    private String interactionType; // CLICK, VIEW, DWELL, SCROLL, SHARE

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "scroll_depth")
    private Integer scrollDepth;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at")
    private Date createdAt = new Date();

    // Getters and Setters omitted for brevity
}

@Entity
@Table(name = "tag_subscriptions")
public class TagSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "tag_id", nullable = false)
    private UUID tagId;

    // Getters and Setters omitted for brevity
}

@Entity
@Table(name = "user_subscriptions")
public class UserSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "follower_id", nullable = false)
    private UUID followerId;

    @Column(name = "followed_id", nullable = false)
    private UUID followedId;

    // Getters and Setters omitted for brevity
}