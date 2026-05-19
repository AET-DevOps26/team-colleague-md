# Verita — Project Plan

**Project:** Verita AI Knowledge Platform
**Team:** 3 members — Backend / Frontend / GenAI
**Sprint:** May 13 – June 17, 2026 (5 weeks)
**Repository:** AET-DevOps26/team-colleague-md

---

## Sprint Overview

| Week | Dates     | Backend                          | Frontend                  | GenAI                          | Infrastructure                                          | Deliverable                             |
| ---- | --------- | -------------------------------- | ------------------------- | ------------------------------ | ------------------------------------------------------- | --------------------------------------- |
| W1   | May 11–17 | OpenAPI Spec + DB Schema (all 3) | Reseach &Learning         | Reseach &Learning              | Pre-commit, CI basics, Docker Compose                   | Unified openapi.yaml, CI running on PRs |
| W2   | May 18–24 | User Service                     | Auth UI                   | LangChain + Summarization      | Full CI with tests, Code gen script, Multi-stage Docker | User Service live, Auth UI functional   |
| W3   | May 25–31 | Content Service                  | Feed + Post pages         | Auto-tag + Daily Digest        | Kubernetes manifests, CD pipeline to K8s                | All content features working            |
| W4   | Jun 1–7   | Recommendation Service           | Discovery + Profile pages | Cross-service integration + P2 | API Gateway, Prometheus metrics                         | Full backend stack, frontend core done  |
| W5   | Jun 8–14  | Integration + bug fixes (all 3)  | E2E tests + polish        | RAG (if time)                  | Grafana dashboards + alert rules                        | Demo-ready platform                     |

---

## Backlog

### Week 1 — Foundation (May 11–17)

All three members work together. No parallel tracks yet.
Prerequisites for all subsequent work: unified API spec and DB schema must be finalized before W2.

---

**Complete OpenAPI Specification for All Services**
Labels: `all-tracks` `P0` `W1`
- [ ] Define User Service endpoints (auth, profile, verification, role management)
- [ ] Define Content Service endpoints (posts, comments, tags, votes, bookmarks)
- [ ] Define Recommendation Service endpoints (feed, trending, subscriptions, notifications, interactions)
- [ ] Define GenAI Service endpoints (summarize, suggest-tags, daily-digest)
- [ ] Validate spec: `npx @redocly/cli lint api/openapi.yaml`
- [ ] Add request/response examples and pagination parameters for all list endpoints
- [ ] Generate HTML documentation

---

**Finalize Database Schema**
Labels: `backend` `P0` `W1`
- [ ] Define user_schema: users, verification_requests
- [ ] Define content_schema: posts, comments, tags, post_tags, votes, bookmarks
- [ ] Define recommendation_schema: user_interactions, tag_subscriptions, trending_posts, notifications
- [ ] GenAI database?
- [ ] Write CREATE TABLE statements with indexes
- [ ] Team review

---

**CI Pipeline and Pre-commit Setup**
Labels: `infrastructure` `P0` `W1`
- [ ] Configure pre-commit hooks (conventional commit format, trailing whitespace)
- [ ] GitHub Actions CI workflow triggered on all PRs
- [ ] CI job: lint OpenAPI spec - detail?
- [ ] CI job: build check for all 3 services - detail?
- [ ] Add health check endpoints and configs to docker-compose.yml
- [ ] Update README with local setup instructions

---

### Week 2 — Core Services (May 19–23)

---

**Refine API Specification and Database Schema**
Labels: `backend` `P0` `W2`
- [ ] Align User Service API endpoints with Frontend_PRD requirements (auth flows, profile data, user settings)
- [ ] Align Content Service API data model (posts, comments, tags, bookmarks) with frontend needs
- [ ] Align Recommendation Service API (feed, trending, subscriptions) with frontend discovery pages
- [ ] Review and update database schemas to ensure all required fields and relationships are present
- [ ] Team review: backend → frontend, Frontend_PRD → API spec/schema mapping confirmed
- [ ] Update openapi.yaml and database schema documentation

---

**User Service Implementation**
Labels: `backend` `P0` `W2`
- [ ] User authentication: registration and login with JWT token generation
- [ ] User profile management: create, read, and update user profiles with bio, expertise, social links
- [ ] User settings: manage account preferences (digest frequency, privacy settings)
- [ ] User role and permission system: ROLE_USER, ROLE_VERIFIED, ROLE_ADMIN with access control checks
- [ ] Admin capabilities: view and update user roles, manage user verification status
- [ ] Role-based access control enforced at service level
- [ ] Unit tests (>80% coverage)
- [ ] Docker image builds, health check passes at /health

---

**Home UI + Auth UI**
Labels: `frontend` `P0` `W2`
- [ ] Home Feed page layout: sidebar, top bar, tag filter bar, post feed (mock data)
- [ ] Auth Modal: Sign Up and Log In tabs with form validation
- [ ] JWT token management: store in localStorage, attach to API requests via Authorization header
- [ ] Protected routes: redirect to Auth Modal if no valid JWT
- [ ] User Profile page: view user info, edit profile form (bio, expertise, social links)
- [ ] Settings Modal: account settings, digest frequency, privacy toggles
- [ ] Responsive layout and component integration
- [ ] Works against User Service API or Prism mock server

---

**GenAI Service Foundation**
Labels: `genai` `P1` `W2`
- [ ] FastAPI project structure and dependencies configured
- [ ] LangChain integration for LLM interactions (environment-based API key configuration)
- [ ] Summarization capability: accepts content and returns structured summary
- [ ] Fallback mechanism for local model support (implementation details TBD)
- [ ] Basic endpoint testing with pytest
- [ ] Dockerfile builds and service starts

---

**Database Setup and Test Data**
Labels: `infrastructure` `P0` `W2`
- [ ] PostgreSQL: initialize local instance (Docker Compose), create databases for all services
- [ ] MinIO: initialize local S3-compatible storage for file uploads (post cover images, user avatars)
- [ ] Create test data scripts: seed users, posts, tags, comments for manual testing
- [ ] Verify connectivity: all services can connect to PostgreSQL and MinIO
- [ ] Document database connection strings and credentials for local development
- [ ] Health check endpoints confirm database and storage availability

---

**Full CI Pipeline + Docker Improvements**
Labels: `infrastructure` `P0` `W2`
- [ ] CI: run unit tests for all 3 services on every PR
- [ ] OpenAPI code generation script: api/scripts/gen-all.sh
  - Generate Spring Boot stubs (openapi-generator-cli)
  - Generate Python client (openapi-python-client)
  - Generate TypeScript types (openapi-typescript)
- [ ] Run gen-all.sh in CI after spec lint
- [ ] Multi-stage Dockerfiles for all services (smaller production images)
- [ ] GitHub Actions dependency caching (Maven, pip, npm)

---

### Week 3 — Content Layer (May 26–30)

---

**Content Service Implementation**
Labels: `backend` `P0` `W3`
- [ ] POST /api/v1/posts — create post with title, Markdown body, tags, source URL
- [ ] GET /api/v1/posts — list with tag filter, pagination (limit/offset)
- [ ] GET /api/v1/posts/{id}
- [ ] PUT /api/v1/posts/{id} — author only
- [ ] DELETE /api/v1/posts/{id} — author or admin
- [ ] POST /api/v1/posts/{id}/comments — create comment or reply (parentCommentId)
- [ ] GET /api/v1/posts/{id}/comments — threaded
- [ ] PUT and DELETE /api/v1/comments/{id} — author only
- [ ] POST /api/v1/votes — upvote or downvote post or comment
- [ ] DELETE /api/v1/votes — remove vote
- [ ] POST /api/v1/bookmarks, DELETE /api/v1/bookmarks/{id}
- [ ] GET /api/v1/users/{id}/bookmarks
- [ ] GET /api/v1/tags, POST /api/v1/tags
- [ ] Full-text search via PostgreSQL GIN index
- [ ] Denormalized counters (upvoteCount, commentCount) updated on write
- [ ] Unit + integration tests, Docker image builds

---

**Feed and Post Pages**
Labels: `frontend` `P0` `W3`
- [ ] Homepage feed — chronological post list with pagination
- [ ] Filter feed by tag (single and multiple)
- [ ] Post creation page — Markdown editor with real-time preview, tag input, source URL field
- [ ] Post detail page — full content, AI summary button, vote controls
- [ ] Comment section — threaded display, submit reply
- [ ] Bookmark button on post detail
- [ ] Author can edit and delete their own posts and comments

---

**Auto-tag Suggestion + Daily Digest**
Labels: `genai` `P1` `W3`
- [ ] POST /api/v1/genai/suggest-tags — analyze post content, return ranked tag list
- [ ] POST /api/v1/genai/daily-digest — aggregate posts by topic, return summary per subscribed tag
- [ ] Scheduled trigger for daily digest (cron at 04:00)
- [ ] Response caching to avoid redundant LLM calls (Redis or in-memory)
- [ ] pytest tests for both endpoints

---

**Kubernetes Setup + CD Pipeline**
Labels: `infrastructure` `P0` `W3`
- [ ] Write Kubernetes manifests for all services (Deployment, Service, ConfigMap, Secret)
- [ ] Helm chart or raw manifests — choose one approach and document it
- [ ] CD pipeline: auto-deploy to K8s cluster on merge to main
- [ ] Kubernetes Secrets for all API keys and DB credentials (no hardcoded values)
- [ ] Verify all services start and communicate in cluster
- [ ] Add K8s setup instructions to README

---

### Week 4 — Recommendation + Discovery (Jun 2–6)

---

**Recommendation Service Implementation**
Labels: `backend` `P1` `W4`
- [ ] GET /api/v1/feed — personalized feed based on user interaction history
- [ ] GET /api/v1/feed/personalized — weighted by subscriptions and interactions
- [ ] GET /api/v1/trending?timeWindow=DAY|WEEK — ranked by trending score
- [ ] POST /api/v1/subscriptions — subscribe to tag
- [ ] DELETE /api/v1/subscriptions/{tagId} — unsubscribe
- [ ] GET /api/v1/subscriptions
- [ ] GET /api/v1/notifications
- [ ] PUT /api/v1/notifications/{id}/read
- [ ] DELETE /api/v1/notifications/{id}
- [ ] POST /api/v1/interactions/track — log VIEW, CLICK, UPVOTE, COMMENT, BOOKMARK
- [ ] Notification types: COMMENT, UPVOTE, VERIFICATION_APPROVED, DAILY_DIGEST, NEW_POST_IN_SUBSCRIBED_TAG
- [ ] Unit + integration tests, Docker image builds

---

**Discovery + Profile Pages**
Labels: `frontend` `P1` `W4`
- [ ] Trending page with DAY / WEEK filter
- [ ] Tag subscription UI — subscribe/unsubscribe from post detail and tag pages
- [ ] Personalized feed on homepage (replace chronological once Recommendation Service is live)
- [ ] User profile page — view and edit bio, expertise, social links
- [ ] Notification list — mark as read, delete
- [ ] (P2) Semantic search bar with natural language input

---

**Cross-service Integration + P2 Features**
Labels: `genai` `P1` `W4`
- [ ] Integration: summarize triggered on post creation (Content → GenAI)
- [ ] Integration: tag suggestions displayed in post creation form
- [ ] Integration: daily digest uses subscriptions from Recommendation Service
- [ ] End-to-end test for all GenAI flows
- [ ] (P2) POST /api/v1/genai/sentiment — return sentiment score (0–100, bullish/skeptical) for a post
- [ ] (P2) POST /api/v1/genai/verify — flag potentially misleading content

---

**API Gateway + Prometheus**
Labels: `infrastructure` `P0` `W4`
- [ ] Deploy Traefik or NGINX as API gateway in K8s
- [ ] Route all external traffic through gateway
- [ ] Centralize JWT validation at gateway level
- [ ] Add Prometheus metrics to all backend services:
  - Request count per endpoint
  - Request latency (p50, p90, p99)
  - Error rate (4xx, 5xx)
- [ ] Prometheus scrape config for all services and GenAI service
- [ ] Verify metrics appear in Prometheus UI

---

### Week 5 — Integration and Release (Jun 9–13)

All three members collaborate on final integration, testing, and release preparation.

---

**Full System Integration + Bug Fixes**
Labels: `all-tracks` `P0` `W5`
- [ ] End-to-end user journey: Register → Login → Create Post → AI Summary → Comment → Vote → Bookmark
- [ ] Verify cross-service communication under realistic load
- [ ] Fix bugs identified during integration
- [ ] Confirm CD pipeline deploys cleanly from main to K8s

---

**Frontend E2E Tests + Final Polish**
Labels: `frontend` `P0` `W5`
- [ ] All P0 pages complete and mobile-responsive
- [ ] E2E tests for critical user flows (auth, post creation, feed, comments)
- [ ] Loading states and error states handled throughout
- [ ] (P2) Semantic search UI connected to GenAI RAG endpoint if available

---

**GenAI P2 — RAG with Weaviate**
Labels: `genai` `P2` `W5`
- [ ] Weaviate vector database deployed in K8s
- [ ] Post content embedded and indexed on creation
- [ ] POST /api/v1/genai/search — semantic similarity query, return ranked post list
- [ ] Connect to frontend search UI

---

**Grafana Dashboards + Alerts + Final Submission**
Labels: `infrastructure` `P0` `W5`
- [ ] Grafana dashboards showing per-service: request rate, latency, error rate
- [ ] GenAI service latency and LLM call count visible in dashboard
- [ ] At least 1 alert rule configured (e.g., service down or latency > 2s)
- [ ] Export all dashboards as .json files committed to repo
- [ ] Alert rule files committed to repo
- [ ] Final README review: setup, architecture, API docs reference, CI/CD, monitoring, member responsibilities
- [ ] Presentation slides and live demo preparation
