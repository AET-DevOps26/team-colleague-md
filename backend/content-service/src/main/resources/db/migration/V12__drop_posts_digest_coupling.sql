-- Hard cut (ADR-0019): digests are no longer DIGEST-type posts. Remove the old rows and the
-- per-user association column from posts. Pre-launch / seed-driven, so no data preservation.
DELETE FROM post_topics      WHERE post_id IN (SELECT id FROM posts WHERE type = 'DIGEST');
DELETE FROM post_source_urls WHERE post_id IN (SELECT id FROM posts WHERE type = 'DIGEST');
DELETE FROM posts WHERE type = 'DIGEST';

DROP INDEX IF EXISTS idx_posts_target_user;
ALTER TABLE posts DROP COLUMN IF EXISTS target_user_id;
