-- Baseline schema for user-service.
--
-- Until now this service ran with Hibernate `ddl-auto=update`, which managed the schema
-- implicitly. This file captures that exact schema (generated from Hibernate's own DDL) so
-- the service can switch to Flyway + `validate`. Column types/constraints are reproduced
-- verbatim; only formatting and constraint names differ.
--
-- Existing databases (already created by ddl-auto=update) are marked as baselined at this
-- version and do NOT run this script — see spring.flyway.baseline-on-migrate. Fresh databases
-- (tests, new deployments) run it from scratch.

CREATE TABLE users (
    id                   uuid         NOT NULL,
    username             varchar(255) NOT NULL UNIQUE,
    display_name         varchar(255),
    email                varchar(255) NOT NULL UNIQUE,
    password             varchar(255) NOT NULL,
    avatar_url           varchar(255),
    bio                  varchar(1000),
    website              varchar(255),
    organisation         varchar(255),
    role                 varchar(255) NOT NULL CHECK (role IN ('USER', 'VERIFIED', 'ADMIN')),
    is_banned            boolean,
    post_count           integer,
    follower_count       integer,
    following_count      integer,
    like_received_count  integer,
    created_at           timestamp(6) with time zone,
    updated_at           timestamp(6) with time zone,
    refresh_token        varchar(255) UNIQUE,
    refresh_token_expiry timestamp(6) with time zone,
    digest_frequency     varchar(255) CHECK (digest_frequency IN ('DAILY', 'WEEKLY', 'FALSE')),
    show_bookmarks       boolean,
    show_likes           boolean,
    PRIMARY KEY (id)
);

-- @ElementCollection backing table for UserEntity.expertiseAreas
CREATE TABLE user_expertise (
    user_id   uuid NOT NULL,
    expertise varchar(255),
    CONSTRAINT fk_user_expertise_user FOREIGN KEY (user_id) REFERENCES users
);
