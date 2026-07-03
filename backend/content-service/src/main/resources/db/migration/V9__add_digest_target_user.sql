-- Per-user digest association (ADR-0013): which user a DIGEST post was personalised for.
-- NULL = global/system digest belonging to no one.
ALTER TABLE posts ADD COLUMN target_user_id UUID;
CREATE INDEX idx_posts_target_user ON posts (target_user_id) WHERE deleted = false;
