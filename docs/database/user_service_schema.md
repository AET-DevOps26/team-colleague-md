# User Service — Database Schema

> This service owns user identity, authentication, and verification.

---

## Enumerations

| Enum Name             | Values                        |
| --------------------- | ----------------------------- |
| `user_role`           | `USER`, `ADMIN`, `VERIFIED`   |
| `verification_type`   | `ORGANIZATION`, `EXPERT`      |
| `verification_status` | `PENDING`, `APPROVED`, `REJECTED` |

---

## Tables

### `users`

Stores user accounts and profile information.

| Column            | Type        | Nullable | Default              | Description                         |
| ----------------- | ----------- | -------- | -------------------- | ----------------------------------- |
| `id`              | `UUID`      | NO       | `gen_random_uuid()`  | Primary key                         |
| `username`        | `TEXT`      | NO       |                      | Unique display name                 |
| `email`           | `TEXT`      | NO       |                      | Unique email address                |
| `password_hash`   | `TEXT`      | NO       |                      | Hashed password                     |
| `role`            | `user_role` | NO       | `'USER'`             | User role enum                      |
| `bio`             | `TEXT`      | YES      |                      | Short biography                     |
| `expertise_areas` | `JSONB`     | YES      |                      | Array of expertise area strings     |
| `social_links`    | `JSONB`     | YES      |                      | Key-value map of social media links |
| `created_at`      | `TIMESTAMP` | NO       | `CURRENT_TIMESTAMP`  | Account creation timestamp          |
| `updated_at`      | `TIMESTAMP` | NO       | `CURRENT_TIMESTAMP`  | Last profile update timestamp       |

**Constraints:**

- `PK` on `id`
- `UNIQUE` on `username`
- `UNIQUE` on `email`

---

### `verification_requests`

Tracks user requests for verified status (organization or expert).

| Column            | Type                  | Nullable | Default             | Description                             |
| ----------------- | --------------------- | -------- | ------------------- | --------------------------------------- |
| `id`              | `UUID`                | NO       | `gen_random_uuid()` | Primary key                             |
| `user_id`         | `UUID`                | NO       |                     | FK → `users.id`                         |
| `request_type`    | `verification_type`   | NO       |                     | Type of verification requested          |
| `supporting_info` | `TEXT`                | YES      |                     | Evidence / justification text           |
| `status`          | `verification_status` | NO       | `'PENDING'`         | Current status of the request           |
| `reviewed_by`     | `UUID`                | YES      |                     | FK → `users.id` (admin who reviewed)    |
| `reviewed_at`     | `TIMESTAMP`           | YES      |                     | Timestamp when the request was reviewed |
| `created_at`      | `TIMESTAMP`           | NO       | `CURRENT_TIMESTAMP` | Submission timestamp                    |

**Constraints:**

- `PK` on `id`
- `FK` `user_id` → `users(id)` ON DELETE CASCADE
- `FK` `reviewed_by` → `users(id)` ON DELETE SET NULL

---

## Entity-Relationship Diagram

```mermaid
erDiagram
    users {
        UUID id PK
        TEXT username UK
        TEXT email UK
        TEXT password_hash
        user_role role
        TEXT bio
        JSONB expertise_areas
        JSONB social_links
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    verification_requests {
        UUID id PK
        UUID user_id FK
        verification_type request_type
        TEXT supporting_info
        verification_status status
        UUID reviewed_by FK
        TIMESTAMP reviewed_at
        TIMESTAMP created_at
    }

    users ||--o{ verification_requests : "submits"
```

---

## Indexes

| Table                   | Index                | Type   | Purpose            |
| ----------------------- | -------------------- | ------ | ------------------ |
| `users`                 | `idx_users_username` | UNIQUE | Login lookup       |
| `users`                 | `idx_users_email`    | UNIQUE | Email lookup       |
| `verification_requests` | `idx_verif_user_id`  | B-TREE | Requests per user  |
| `verification_requests` | `idx_verif_status`   | B-TREE | Admin review queue |
