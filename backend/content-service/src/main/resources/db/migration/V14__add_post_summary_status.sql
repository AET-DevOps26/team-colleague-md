ALTER TABLE posts
    ADD COLUMN summary_status VARCHAR(20),
    ADD COLUMN summary_generated_at TIMESTAMPTZ,
    ADD COLUMN summary_model VARCHAR(100);

UPDATE posts
SET summary_status = CASE
    WHEN content_summary IS NOT NULL AND btrim(content_summary) <> '' THEN 'COMPLETED'
    ELSE 'NONE'
END;

ALTER TABLE posts
    ALTER COLUMN summary_status SET NOT NULL,
    ALTER COLUMN summary_status SET DEFAULT 'NONE',
    ADD CONSTRAINT posts_summary_status_check
        CHECK (summary_status IN ('PENDING', 'COMPLETED', 'FAILED', 'NONE'));
