-- US-3: user search is non-sargable.
-- UserRepository.findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase compiles
-- to `lower(col) LIKE lower('%term%')` — a leading-wildcard match that no B-tree index can
-- serve, so it sequentially scans `users`. A pg_trgm GIN index on the lowercased columns makes
-- these substring searches index-assisted.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_users_username_trgm     ON users USING gin (lower(username) gin_trgm_ops);
CREATE INDEX idx_users_display_name_trgm ON users USING gin (lower(display_name) gin_trgm_ops);
