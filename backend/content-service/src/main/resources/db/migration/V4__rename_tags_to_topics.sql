ALTER TABLE tags RENAME TO topics;
ALTER TABLE topics RENAME CONSTRAINT uq_tags_name TO uq_topics_name;
ALTER INDEX idx_tags_usage_count RENAME TO idx_topics_usage_count;

ALTER TABLE post_tags RENAME TO post_topics;
ALTER TABLE post_topics RENAME COLUMN tag_id TO topic_id;
