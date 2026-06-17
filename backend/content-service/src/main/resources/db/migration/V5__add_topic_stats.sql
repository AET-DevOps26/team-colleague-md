-- Rolling stats columns on topics

ALTER TABLE topics
    ADD COLUMN posts_this_week BIGINT       NOT NULL DEFAULT 0,
    ADD COLUMN posts_prev_week BIGINT       NOT NULL DEFAULT 0,
    ADD COLUMN activity_score  NUMERIC(6,3) NOT NULL DEFAULT 0.000,
    ADD COLUMN is_hot          BOOLEAN      NOT NULL DEFAULT false;

-- Weekly snapshot table (one row per topic per ISO week)

CREATE TABLE topic_weekly_stats (
    id          UUID        PRIMARY KEY,
    topic_id    UUID        NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    week_start  DATE        NOT NULL,
    post_count  BIGINT      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_topic_week UNIQUE (topic_id, week_start)
);

CREATE INDEX idx_topic_weekly_stats_week_start ON topic_weekly_stats (week_start);
