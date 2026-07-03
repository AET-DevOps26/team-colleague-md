-- Password reset tokens for the two-step OTP forgot-password flow.
--
-- forgot-password stores a hashed 6-digit code (code_hash) with a short expiry; verify-reset-code
-- exchanges a matching code for a single-use reset_token; reset-password consumes the token.
-- At most one active row per user: a new forgot-password request deletes the user's prior rows.
-- Rows are removed on successful reset; ON DELETE CASCADE also clears them when the user is deleted.

CREATE TABLE password_reset_tokens (
    id          uuid         NOT NULL,
    user_id     uuid         NOT NULL,
    code_hash   varchar(255) NOT NULL,
    reset_token varchar(255) UNIQUE,
    attempts    integer      NOT NULL DEFAULT 0,
    expires_at  timestamp(6) with time zone NOT NULL,
    created_at  timestamp(6) with time zone NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_password_reset_user ON password_reset_tokens (user_id);
