-- Standalone digest entity (ADR-0019), decoupled from posts. The whole events array is read/written
-- as one JSONB unit; preview_headlines is denormalized at write time so list reads skip the blob.
CREATE TABLE digests (
    id                UUID PRIMARY KEY,
    digest_type       VARCHAR(16) NOT NULL,
    target_user_id    UUID,
    digest_date       DATE NOT NULL,
    title             VARCHAR(200) NOT NULL,
    subtitle          TEXT,
    summary           TEXT,
    events            JSONB NOT NULL DEFAULT '[]'::jsonb,
    topics            JSONB NOT NULL DEFAULT '[]'::jsonb,
    event_count       INTEGER NOT NULL DEFAULT 0,
    source_count      INTEGER NOT NULL DEFAULT 0,
    read_time_min     INTEGER NOT NULL DEFAULT 1,
    preview_headlines TEXT[] NOT NULL DEFAULT '{}',
    model             VARCHAR(255),
    generated_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- PUBLIC digests belong to no one; PERSONAL digests must name their target.
    CONSTRAINT chk_digest_type_target CHECK (
        (digest_type = 'PUBLIC'   AND target_user_id IS NULL) OR
        (digest_type = 'PERSONAL' AND target_user_id IS NOT NULL)
    )
);

-- History lookups: newest personal digests per user, newest public digests overall.
CREATE INDEX idx_digests_target_user_date ON digests (target_user_id, digest_date DESC);
CREATE INDEX idx_digests_type_date ON digests (digest_type, digest_date DESC);
