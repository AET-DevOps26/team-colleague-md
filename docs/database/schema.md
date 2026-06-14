# Database Schema — Overview

Each microservice owns its own PostgreSQL database. Cross-service references store `UUID` values but have **no database-level foreign key constraints** — integrity is maintained at the application layer via API calls.

This overview reflects the baseline (P0/P1) design. P2-only tables are noted but not modeled in the per-service docs.

---

## Service Schema Files

| Service                  | Schema File                                                          | Tables                                                                                                  |
| ------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **User Service**         | [user_service_schema.md](./user_service_schema.md)                   | `users`                                                                                                 |
| **Content Service**      | [content_service_schema.md](./content_service_schema.md)             | `posts`, `comments`, `topics`, `topic_categories`, `topic_weekly_stats`, `post_topics`, `post_reactions`, `comment_likes`, `bookmarks` |
| **Recommendation Service** | [recommendation_service_schema.md](./recommendation_service_schema.md) | `user_interactions`, `topic_subscriptions` <br>(P2 optional: `user_follows`, `notifications`)         |

---

## Cross-Service Reference Map

```mermaid
graph LR
    subgraph US["User Service DB"]
        users
    end

    subgraph CS["Content Service DB"]
        posts
        comments
        topics
        post_reactions
        comment_likes
        bookmarks
    end

    subgraph RS["Recommendation Service DB"]
        user_interactions
        topic_subscriptions
    end

    posts -.->|user_id| users
    comments -.->|user_id| users
    post_reactions -.->|user_id| users
    comment_likes -.->|user_id| users
    bookmarks -.->|user_id| users
    user_interactions -.->|user_id| users
    user_interactions -.->|post_id| posts
    topic_subscriptions -.->|user_id| users
    topic_subscriptions -.->|topic_id| topics
```

> **Legend:** Dashed arrows (`-.->`) are cross-service UUID references (no DB-level FK).
> Within a service, references (e.g. `post_topics` → `posts`/`topics`, `comments` → `posts`) are real foreign keys — see each service's schema doc.

---

## Conventions

| Convention         | Detail                                                                            |
| ------------------ | -------------------------------------------------------------------------------- |
| **Primary Keys**   | `UUID` with `gen_random_uuid()` default (except curated `topic_categories.id`, a slug) |
| **String columns** | `TEXT` by default; `VARCHAR(n)` where a length cap is meaningful (e.g. topic slug/label) |
| **Timestamps**     | `TIMESTAMP` with `CURRENT_TIMESTAMP` default                                     |
| **Enums**          | Stored as strings via `@Enumerated(EnumType.STRING)` — **not** native PostgreSQL enum types |
| **Cross-service**  | Stored as plain `UUID`, no FK constraint; resolved via inter-service API calls   |
| **Soft delete**    | Content uses `is_deleted` flags (posts, comments) rather than hard deletes       |
