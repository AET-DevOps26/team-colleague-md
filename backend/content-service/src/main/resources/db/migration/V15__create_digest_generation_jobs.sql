-- Admin-triggered digest generation tracking (ADR-0020). A digest row only appears once generation
-- succeeds, so an in-flight or failed run has nowhere to record itself: this table is that record.
-- It is an operational log for the admin panel, not part of the digest read model.
CREATE TABLE digest_generation_jobs (
    id             UUID PRIMARY KEY,
    target_user_id UUID NOT NULL,
    digest_date    DATE NOT NULL,
    force_rerun    BOOLEAN NOT NULL DEFAULT false,
    status         VARCHAR(16) NOT NULL,
    message        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at    TIMESTAMPTZ,
    CONSTRAINT digest_generation_jobs_status_check
        CHECK (status IN ('PENDING', 'COMPLETED', 'SKIPPED', 'FAILED'))
);

CREATE INDEX idx_digest_generation_jobs_user_date
    ON digest_generation_jobs (target_user_id, digest_date DESC);
