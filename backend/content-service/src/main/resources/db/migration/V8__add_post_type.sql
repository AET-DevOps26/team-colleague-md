-- AI Daily Digest support: classify posts as NORMAL (user-authored) or DIGEST (system-generated).
ALTER TABLE posts ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
CREATE INDEX idx_posts_type ON posts (type) WHERE deleted = false;
