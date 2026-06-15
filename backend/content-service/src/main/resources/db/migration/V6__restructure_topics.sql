-- topic_categories lookup table

CREATE TABLE topic_categories (
    id         VARCHAR(50)  PRIMARY KEY,
    label      VARCHAR(100) NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0
);

-- Evolve topics to the full desired schema

ALTER TABLE topics RENAME COLUMN usage_count TO total_post_count;

ALTER TABLE topics
    ALTER COLUMN name             TYPE VARCHAR(50),
    ALTER COLUMN total_post_count TYPE INT,
    ALTER COLUMN posts_this_week  TYPE INT,
    ALTER COLUMN posts_prev_week  TYPE INT,
    ALTER COLUMN activity_score   TYPE NUMERIC(4,3);

ALTER TABLE topics
    ADD COLUMN display_name   VARCHAR(100),
    ADD COLUMN category_id    VARCHAR(50) REFERENCES topic_categories(id),
    ADD COLUMN sort_order     INT NOT NULL DEFAULT 0,
    ADD COLUMN follower_count INT NOT NULL DEFAULT 0;

-- Replace the V5 topic_weekly_stats table with a composite-PK version

DROP TABLE topic_weekly_stats;

CREATE TABLE topic_weekly_stats (
    topic_id   UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    post_count INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (topic_id, week_start)
);

CREATE INDEX idx_topic_weekly_stats_week_start ON topic_weekly_stats (week_start);
