-- Add a stored generated tsvector column so FTS queries use an index rather than a full table scan.
-- The 'english' configuration is specified explicitly to satisfy PostgreSQL's IMMUTABLE requirement
-- for generated columns. Existing rows are back-filled automatically on ALTER TABLE.

ALTER TABLE posts
    ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
        ) STORED;

CREATE INDEX idx_posts_fts ON posts USING gin(search_vector)
    WHERE deleted = false;
