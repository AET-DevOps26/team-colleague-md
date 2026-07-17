# System Overview → Architecture

**Project:** AI Knowledge Sharing Platform (Verita)
**Team:** Colleagues.md
**Date:** June 2026
**Version:** 1.1

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack Decisions](#2-technology-stack-decisions)
3. [System Architecture](#3-system-architecture)
4. [UML Diagrams](#4-uml-diagrams)
5. [Initial Product Backlog](#5-initial-product-backlog)

---

## 1. System Overview

### 1.1 Project Description

Verita is an AI-focused community platform designed to address the information overload problem in the rapidly evolving AI industry. The platform enables developers, researchers, and enthusiasts to share and discover practical AI knowledge through intelligent content curation, automated summarization, and personalized recommendations. See more in [Problem Statement](../product/Problem_Statement.md)

### 1.2 Core System Components

The system follows a microservices architecture consisting of:

**Service Layer:**
- **User Service:** Authentication, profile management, account verification
- **Content Service:** Posts, comments, topics, likes/dislikes, bookmarks
- **Recommendation Service:** Personalized feed, trending calculation, topic subscriptions
- **GenAI Service:** AI-powered summarization, daily digest generation

**Infrastructure Layer:**
- **API Gateway / Reverse Proxy:** Path-prefix routing that strips the prefix before forwarding (Vite proxy in local dev; the frontend container's nginx on the Azure VM and on Kubernetes, where a trivial `/` Ingress forwards everything to it). JWT tokens are validated independently by each backend service, not at the gateway.
- **PostgreSQL Databases:** One PostgreSQL 16 instance per service (user, content, recommendation) — there is no shared instance
- **Object Storage (MinIO):** S3-compatible store for user portraits and post images
- **Monitoring Stack:** Prometheus and Grafana for observability

**Client Layer:**
- **React Frontend:** Web application with Markdown editor, masonry layout, real-time updates

---

## 2. Technology Stack Decisions

### 2.1 Backend Services

```yaml
Framework: Spring Boot 4.0.6
Language: Java 25
Build Tool: Gradle (Groovy DSL)
Database Access: Spring Data JPA + Hibernate
Authentication: JWT (JSON Web Tokens)
Testing: JUnit 5, Mockito, Spring Boot Test
Key Libraries:
  - Spring Security (authentication/authorization)
  - Spring Web (REST API)
  - Spring Actuator (monitoring endpoints)
```

**Rationale:**
- Spring Boot is mandated by course requirements and provides mature ecosystem
- Gradle chosen as TUM Java course standard with faster builds than Maven
- JWT enables stateless authentication suitable for microservices architecture
- Spring Actuator integrates seamlessly with Prometheus for monitoring

**JWT Authentication Flow:**
1. User logs in with credentials → Server validates and generates JWT
2. Client stores JWT (localStorage) and includes in `Authorization: Bearer <token>` header
3. Each service independently validates JWT signature without database lookup
4. Token expires after 24 hours, requiring re-authentication

**Why JWT over Session-based Auth:**
- **Stateless:** No server-side session storage required
- **Scalable:** Each microservice validates tokens independently
- **Distributed-friendly:** Works across multiple services without sticky sessions

---

### 2.2 Frontend Application

**Phase 1: Conservative Stack (MVP - Weeks 1-4)**

```yaml
Core Framework:
  - React 19 with TypeScript
  - Build Tool: Vite
  - Package Manager: npm

Essential Libraries:
  - Routing: React Router v6
  - HTTP Client: Axios
  - UI Components: Chakra UI (out-of-the-box components)
  - Styling: Chakra UI's built-in system
  - Forms: React Hook Form + Zod validation
  - Markdown: react-markdown + react-syntax-highlighter
```

**Rationale for Conservative Approach:**
- Chakra UI requires minimal configuration, ideal for team members new to React
- Single styling system reduces learning curve
- All libraries have extensive documentation and active communities
- Focus on learning React fundamentals before introducing complex patterns

**Phase 2: Optimization (Weeks 5-8)**

```yaml
Performance:
  - State Management: Zustand (lightweight global state)
  - Server State: React Query (caching, refetching)
  - Code Splitting: React.lazy + Suspense

Enhanced Features:
  - Layout: react-masonry-css (Pinterest-style card grid)
  - Infinite Scroll: react-infinite-scroll-component
  - Animations: Framer Motion
```

**Phase 3: Advanced (Weeks 9-12)**

```yaml
Potential Upgrades:
  - UI Library: shadcn/ui or Ant Design (if more customization needed)
  - Styling: Tailwind CSS (utility-first approach)
  - Framework: Next.js 14 (SSR, better SEO)
  - Real-time: Socket.io for live updates
```

**Progressive Enhancement Strategy:**
Start simple → Add complexity only when needed → Optimize based on real requirements

---

### 2.3 GenAI Service

```yaml
Framework: FastAPI (Python 3.12)
AI Framework: LangChain
LLM Provider: Pluggable via LLM_PROVIDER config (no code change to switch)
  - NVIDIA NIM (default, e.g. moonshotai/kimi-k2.6)
  - OpenRouter (OpenAI-compatible endpoint)
  - Google Gemini
External Content Sources (Daily Digest):
  - GitHub API
  - GNews API
Observability: Prometheus /metrics endpoint (prometheus-fastapi-instrumentator)
Testing: pytest, pytest-asyncio
API Documentation: Auto-generated via FastAPI (Swagger UI)
```

**Rationale:**
- FastAPI provides automatic OpenAPI documentation and async support
- LangChain abstracts the model behind one interface, so the LLM provider (NVIDIA / OpenRouter / Google) is swappable via configuration without code changes
- The service is **stateless**: it generates text only and persists nothing — summaries are stored by Content Service on the post, and the Daily Digest is published as a `type = DIGEST` post (no GenAI-owned database)

---

### 2.4 Database

```yaml
Database System: PostgreSQL 16 — one independent instance per service
Per-Service Databases:
  - verita_users (User Service)
  - verita_contents (Content Service)
  - verita_recommendations (Recommendation Service)

Object Storage: MinIO (S3-compatible), per-service least-privilege buckets
  - verita-user-portraits (User Service — avatars/portraits)
  - verita-post-photos (Content Service — post & cover images)

Key Features:
  - JSONB: Flexible storage for user preferences, expertise areas
  - Full-text Search: GIN indexes on post title/content
  - Advanced Indexing: Composite indexes for complex queries
  - ACID Compliance: Ensures data consistency

Connection Pooling: HikariCP (Spring Boot default)
```

**Rationale for PostgreSQL over MySQL:**
1. **Superior JSON Support:** JSONB type with efficient querying and indexing
2. **Full-text Search:** Built-in tsvector and GIN indexes
3. **Complex Queries:** Better optimizer for analytical queries (trending calculations)
4. **Extensibility:** PostGIS for future location-based features (optional)
5. **Standards Compliance:** Stricter SQL standards adherence

**Database Separation Strategy:**
- Each microservice owns its own PostgreSQL database in a separate instance/container, enforcing strict data isolation
- No cross-database joins; cross-service references are stored as soft `UUID` values with **no** foreign-key constraints and resolved via REST API calls
- Enables independent scaling, backup, and potential sharding per service
- Binary assets (images) live in MinIO, not in the database — rows store only the object URL/key

---

## 3. System Architecture

### 3.1 Microservices Decomposition

The system is divided into four independent services following Domain-Driven Design principles:

| Service                    | Port | Responsibility                   | Core Features                                                                                                                               |
| -------------------------- | ---- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **User Service**           | 8081 | User management & authentication | - User registration/login<br>- JWT token generation<br>- Profile management<br>- Account verification system<br>- Role-based access control |
| **Content Service**        | 8082 | Content & community interaction  | - Post CRUD (Markdown support)<br>- Threaded comments<br>- Topic system<br>- Likes/dislikes<br>- Bookmarks                                  |
| **Recommendation Service** | 8083 | Discovery & analytics            | - Personalized feed algorithm<br>- Trending calculation<br>- Topic subscriptions<br>- User interaction tracking<br>- Notification system (P2) |
| **GenAI Service**          | 8000 | AI-powered features              | - Post summarization<br>- Topic suggestions (P2)<br>- Daily digest generation<br>- Sentiment analysis (P2)<br>- Semantic search (P2)        |

**Service Communication Pattern:**
- **Synchronous:** REST API calls (e.g., Content Service → GenAI Service for summarization)
- **Asynchronous (P2):** Message queue (RabbitMQ) for non-blocking operations like digest generation

**Daily Digest Boundary:** (the AI Digest is a special post, not a separate store)
- A scheduled job (daily) selects the top posts by engagement within trending/subscribed topics.
- **GenAI Service** aggregates and summarizes those posts into digest content — it is stateless, generating text only and holding no digest data.
- **Content Service** persists the result as a special post (`type = DIGEST`, authored by a system account). The "AI Digest" page is a normal post query filtered by `type`; each item's source attribution lives in the post's Markdown body / `source_urls`.
- **Recommendation Service** (P2) emits a `DAILY_DIGEST` notification pointing at that post.

---

### 3.2 Data Architecture Overview

**Database Organization:**

Three independent PostgreSQL 16 databases — one per service, no shared instance:

| Database | Owner Service | Tables |
|--------|--------------|--------|
| **verita_users** | User Service | users |
| **verita_contents** | Content Service | posts, comments, topics, post_topics, post_reactions, comment_likes, bookmarks |
| **verita_recommendations** | Recommendation Service | user_interactions, topic_subscriptions <br>(P2: user_follows, notifications) |

**Object Storage (MinIO):**

Binary assets are stored in MinIO, not in PostgreSQL — database rows hold only the object URL/key.

| Bucket | Owner Service | Contents |
|--------|--------------|----------|
| **verita-user-portraits** | User Service | User avatars / portrait images |
| **verita-post-photos** | Content Service | Post inline images and cover images |

---

## 4. UML Diagrams

### 4.1 Analysis Object Model (Class Diagram)

This diagram illustrates the core domain entities, their attributes, relationships, and key methods.
![Class Diagram](../diagrams/Class%20Diagram.png)


**Key Design Decisions:**

1. **User-Post Relationship:** One-to-many - users create multiple posts, referenced by `userId`
2. **Threaded Comments:** Self-referencing hierarchy via `parentCommentId` (NULL = top-level comment)
3. **Post-Topic Many-to-Many:** Join table `post_topics` for flexible categorization
4. **Separate reaction tables:** `post_reactions` (LIKE/DISLIKE) for posts and `comment_likes` (LIKE only) for comments — posts support dislikes, comments do not
5. **Denormalized Counts:** Performance optimization - `viewCount`, `likeCount`, `dislikeCount`, `commentCount` stored directly in Post
6. **Cross-Service References:** `userId` in Post references User Service (soft reference, no FK constraint)

---

### 4.2 Use Case Diagram
This diagram captures the primary actors (users) and their interactions with the system's core functionalities.
![Use Case Diagram](../diagrams/Use%20Case%20Diagram.png)

---

### 4.3 Component Diagram (Top-Level Architecture)
This diagram shows the high-level components (services) and their interactions, including external dependencies.
![Component Diagram](../diagrams/Component%20Diagram.png)

---

## 5. Initial Product Backlog

The backlog is organized into 6 Epics matching the [Problem Statement](../product/Problem_Statement.md). Each Epic lists core functionalities at a high level, tagged by priority (P0 must-have, P1 should-have, P2 nice-to-have). Detailed User Stories with acceptance criteria live in the Problem Statement.

### Epic 1: User Management & Authentication

**Core Features:**
- Guest browsing of public content (P0)
- Email/password registration and login with JWT sessions (P0)
- Role-based access control — USER, VERIFIED, ADMIN (P0)
- Admin user management: role changes and bans (P0)
- Profile management — bio, expertise areas, website (P1)
- Verification badge on verified accounts and their posts (P1)
- Verification application + admin review flow; verified-account perks (P2)

---

### Epic 2: Content Creation & Posting

**Core Features:**
- Create posts with Markdown body and syntax-highlighted code (P0)
- Add topics, a dedicated source section, and inline hyperlinks (P0)
- Draft lifecycle: explicit + auto-saved drafts, publish/unpublish, manage from profile (P1)
- Edit and delete own posts (P1)
- Markdown live preview (P1)
- Insert images (URL or file upload) and a cover image, stored in MinIO (P1)

---

### Epic 3: AI-Powered Content Intelligence

**Core Features:**
- On-demand AI summary on posts, stored on the post (P1)
- AI Daily Digest of subscribed topics — generated by GenAI, published as a `type = DIGEST` post (P1)
- Source attribution on each digest item (P1)
- Automatic topic suggestions (P2)
- Sentiment score on posts; automatic fake-news flagging (P2)
- Digest frequency preference; in-app notifications + per-activity preferences; email/inbox delivery (P2)

---

### Epic 4: Community Engagement & Interaction

**Core Features:**
- Threaded comments with nested replies (P0)
- Share button to copy a post's link (P0)
- Like/dislike posts (P1)
- Bookmark/save posts to a personal library (P1)
- Delete own comments; post authors moderate comments on their posts (P1)
- Like comments; @mention users; follow other users; sort comments (P2)

---

### Epic 5: Personalized Discovery & Feed

**Core Features:**
- Homepage feed of recent posts (P0)
- Filter feed by topic (P0)
- Subscribe to topics (P1)
- Topic total post count + past-week growth (P1)
- Personalized recommendation feed from subscriptions + behavior; trending by engagement (P1)
- RAG-based semantic search (P2)

---

### Epic 6: Quality Control & Moderation

**Core Features:**
- Moderation dashboard for flagged content (P2)
- Admin delete posts/comments and ban repeat violators (P2)
- User flag/report posts and comments (P2)
- Transparent moderation labels, e.g. "[deleted by moderator]" (P2)

---
