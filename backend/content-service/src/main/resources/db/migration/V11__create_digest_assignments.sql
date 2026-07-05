-- Assigns the day's PUBLIC digest to a zero-subscription user (ADR-0018/0019). One row per user per
-- day makes personal and public digests mutually exclusive for that user on that day.
CREATE TABLE digest_assignments (
    user_id     UUID NOT NULL,
    digest_date DATE NOT NULL,
    digest_id   UUID NOT NULL,   -- references the PUBLIC digests.id row (no DB-level FK, ADR-0019)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, digest_date)
);

CREATE INDEX idx_digest_assignments_digest ON digest_assignments (digest_id);
