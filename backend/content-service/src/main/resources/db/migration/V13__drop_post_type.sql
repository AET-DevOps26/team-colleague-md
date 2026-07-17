-- Digests now live in the standalone digests table (ADR-0019), so posts no longer need a type.
DROP INDEX IF EXISTS idx_posts_type;
ALTER TABLE posts DROP COLUMN IF EXISTS type;
