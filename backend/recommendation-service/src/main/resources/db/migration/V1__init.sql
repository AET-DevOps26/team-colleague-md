CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Notifications ────────────────────────────────────────────────────────────

CREATE TABLE notifications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL,
    type            VARCHAR(64) NOT NULL,
    content         TEXT        NOT NULL,
    related_post_id UUID,
    is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id    ON notifications (user_id);
-- Partial index: only unread rows, used by the unreadOnly filter
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read) WHERE is_read = FALSE;

-- ─── Interactions ─────────────────────────────────────────────────────────────

CREATE TABLE interactions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID,
    post_id          UUID        NOT NULL,
    interaction_type VARCHAR(32) NOT NULL,
    duration_seconds INTEGER     CHECK (duration_seconds >= 0),
    scroll_depth     INTEGER     CHECK (scroll_depth BETWEEN 0 AND 100),
    metadata         JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interactions_user_post  ON interactions (user_id, post_id);
CREATE INDEX idx_interactions_post_type  ON interactions (post_id, interaction_type);

-- ─── Topic subscriptions ──────────────────────────────────────────────────────

CREATE TABLE topic_subscriptions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL,
    topic_id   UUID        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_topic_subscriptions_user_topic UNIQUE (user_id, topic_id)
);

CREATE INDEX idx_topic_subscriptions_user_id ON topic_subscriptions (user_id);

-- ─── User subscriptions (follows) ────────────────────────────────────────────

CREATE TABLE user_subscriptions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID        NOT NULL,
    followed_id UUID        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_subscriptions_pair UNIQUE (follower_id, followed_id)
);

CREATE INDEX idx_user_subscriptions_follower ON user_subscriptions (follower_id);
CREATE INDEX idx_user_subscriptions_followed ON user_subscriptions (followed_id);
