-- Posts

CREATE TABLE posts (
    id              UUID         PRIMARY KEY,
    author_id       UUID         NOT NULL,
    title           VARCHAR(120) NOT NULL,
    content         TEXT         NOT NULL,
    excerpt         TEXT,
    cover_image_url TEXT,
    content_summary TEXT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PUBLISHED',
    like_count      BIGINT       NOT NULL DEFAULT 0,
    dislike_count   BIGINT       NOT NULL DEFAULT 0,
    comment_count   BIGINT       NOT NULL DEFAULT 0,
    view_count      BIGINT       NOT NULL DEFAULT 0,
    save_count      BIGINT       NOT NULL DEFAULT 0,
    deleted         BOOLEAN      NOT NULL DEFAULT false,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL
);

-- Tags

CREATE TABLE tags (
    id          UUID         PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    usage_count BIGINT       NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_tags_name UNIQUE (name)
);

-- Post ↔ Tag join

CREATE TABLE post_tags (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id  UUID NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Post source URLs (ElementCollection)

CREATE TABLE post_source_urls (
    post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    source_url TEXT
);

-- Comments

CREATE TABLE comments (
    id                UUID        PRIMARY KEY,
    post_id           UUID        NOT NULL REFERENCES posts(id),
    author_id         UUID        NOT NULL,
    parent_comment_id UUID        REFERENCES comments(id),
    text              TEXT        NOT NULL,
    like_count        BIGINT      NOT NULL DEFAULT 0,
    deleted           BOOLEAN     NOT NULL DEFAULT false,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL,
    updated_at        TIMESTAMPTZ NOT NULL
);

-- Bookmarks

CREATE TABLE bookmarks (
    id         UUID        PRIMARY KEY,
    user_id    UUID        NOT NULL,
    post_id    UUID        NOT NULL REFERENCES posts(id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_bookmarks_user_post UNIQUE (user_id, post_id)
);

-- Votes

CREATE TABLE votes (
    id          UUID        PRIMARY KEY,
    user_id     UUID        NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id   UUID        NOT NULL,
    vote_type   VARCHAR(20) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_votes_user_target UNIQUE (user_id, target_type, target_id)
);

-- Performance indexes

CREATE INDEX idx_posts_status_created ON posts    (status, created_at DESC) WHERE deleted = false;
CREATE INDEX idx_posts_author_id      ON posts    (author_id)               WHERE deleted = false;
CREATE INDEX idx_comments_post_id     ON comments (post_id)                 WHERE deleted = false;
CREATE INDEX idx_bookmarks_user_id    ON bookmarks(user_id);
CREATE INDEX idx_votes_user_target    ON votes    (user_id, target_type, target_id);
CREATE INDEX idx_tags_usage_count     ON tags     (usage_count DESC);
