-- Index tuning following a DB-structure audit. No table/column changes, so Hibernate
-- `validate` remains green; only the index set is adjusted.

-- ─── Notifications ────────────────────────────────────────────────────────────
-- NotificationService.getNotifications always reads a user's notifications sorted by
-- created_at DESC (paginated), for both the all and unread-only cases. The V1 indexes
-- cover the user_id filter but not the sort, forcing an in-memory sort every page.
-- Replace them with composites that let Postgres serve filter+sort+limit from the index.

DROP INDEX idx_notifications_user_id;
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);

DROP INDEX idx_notifications_user_unread;
CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id, created_at DESC) WHERE is_read = FALSE;

-- ─── Redundant single-column indexes ─────────────────────────────────────────
-- Each duplicates the leading column of an existing UNIQUE constraint's btree index,
-- so it adds write/storage cost without serving any query the unique index can't.

DROP INDEX idx_topic_subscriptions_user_id;  -- ⊂ uq_topic_subscriptions_user_topic (user_id, topic_id)
DROP INDEX idx_user_subscriptions_follower;   -- ⊂ uq_user_subscriptions_pair (follower_id, followed_id)
-- idx_user_subscriptions_followed is kept: followed_id is not a prefix of the unique index.
