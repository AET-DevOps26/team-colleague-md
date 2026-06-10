# Verita — Project Plan

**Project:** Verita AI Knowledge Platform
**Team:** 3 members — Backend / Frontend / GenAI
**Sprint:** May 11 – June 28, 2026 (7 weeks)
**Repository:** AET-DevOps26/team-colleague-md
**Last revised:** June 1, 2026

---

## Overall Status

| Week | Dates     | Status          | Milestone                                    |
| ---- | --------- | --------------- | -------------------------------------------- |
| W1   | May 11–17 | ✅ Complete     | Foundation shipped                           |
| W2   | May 18–24 | ✅ Complete     | User auth + GenAI foundation done            |
| W3   | May 25–31 | ⚠️ Partial     | IaC done; content layer carries over to W4   |
| W4   | Jun 1–7   | 🔄 Active       | Content layer + user profile + digest setup  |
| W5   | Jun 8–14  | ⏳ Upcoming     | Personalization + recommendation live        |
| W6   | Jun 15–21 | ⏳ Upcoming     | New features + monitoring                    |
| W7   | Jun 22–28 | ⏳ Upcoming     | Final integration + demo-ready               |

---

## Sprint Overview

| Week | Dates     | Backend                                    | Frontend                              | GenAI                                | Infrastructure                         |
| ---- | --------- | ------------------------------------------ | ------------------------------------- | ------------------------------------ | -------------------------------------- |
| W1   | May 11–17 | OpenAPI spec + DB schema                   | Research & learning                   | Research & learning                  | Pre-commit, CI, Docker Compose         |
| W2   | May 18–24 | User Service auth + profile                | Auth UI                               | LangChain + summarization            | Full CI, multi-stage Docker            |
| W3   | May 25–31 | *(carry-over resolved)*                    | *(carry-over resolved)*               | *(carry-over resolved)*              | IaC: Terraform + Ansible + CD to VM    |
| W4   | Jun 1–7   | Content Service + Recommendation bootstrap | Feed, post pages, user profile        | Digest schema + topic subscription   | Kubernetes + CD to AET cluster         |
| W5   | Jun 8–14  | Recommendation Service                     | Personalized feed + digest management | Daily digest generation              | API gateway + Prometheus               |
| W6   | Jun 15–21 | Verification + admin                       | Verification + admin UI               | *(P2 features if time permits)*      | Grafana dashboards + alerts            |
| W7   | Jun 22–28 | Integration + bug fixes                    | E2E tests + polish                    | Integration testing                  | Final deployment + README              |

---

## Week 1 — Foundation (May 11–17) ✅ COMPLETE

### 🏁 Milestone: W1 — Foundation Shipped
> Due: May 17 | Status: ✅ Complete

- [x] Unified OpenAPI spec covering all 4 services passes lint
- [x] Database schemas defined for all 3 backend services
- [x] CI pipeline runs on every PR: spec lint + build check
- [x] `docker-compose up` starts all services with health checks
- [x] README documents local setup

---

### Backlog

**Complete OpenAPI Specification for All Services** ✅
Labels: `all-tracks` `P0` `W1`
- [x] User Service: auth, profile, verification, role management
- [x] Content Service: posts, comments, topics, votes, bookmarks
- [x] Recommendation Service: feed, subscriptions, notifications, interactions
- [x] GenAI Service: summarize, suggest-topics, daily-digest
- [x] Spec validated; HTML documentation generated

**Finalize Database Schema** ✅
Labels: `backend` `P0` `W1`
- [x] User schema: users, verification requests
- [x] Content schema: posts, comments, topics, votes, bookmarks
- [x] Recommendation schema: interactions, topic subscriptions, notifications
- [x] Team review completed

**CI Pipeline and Pre-commit Setup** ✅
Labels: `infrastructure` `P0` `W1`
- [x] Pre-commit hooks configured
- [x] CI triggers on all PRs: OpenAPI lint + build check for all services
- [x] Health checks added to docker-compose
- [x] README updated with local setup instructions

---

## Week 2 — Core Services Foundation (May 18–24) ✅ COMPLETE

### 🏁 Milestone: W2 — User Auth + GenAI Foundation
> Due: May 24 | Status: ✅ Complete (W2 carry-overs resolved on June 1)

- [x] Users can register and log in; JWT issued and accepted by all services
- [x] GenAI service starts and returns post summaries
- [x] Spring Boot 4 / Java 25 upgrade complete across all services
- [x] PostgreSQL accessible from all services in local docker-compose
- [x] CI runs unit tests on every PR

---

### Backlog

**Refine API Specification and Database Schema** ✅
Labels: `backend` `P0` `W2`
- [x] All service APIs aligned with Frontend PRD
- [x] Gap analysis completed (issue #44)
- [x] openapi.yaml updated; team review done

**User Service** ✅ — Issue #47
Labels: `backend` `P0` `W2`
- [x] Users can register and log in with JWT authentication
- [x] Users can view and update their profile (bio, expertise, social links)
- [x] Users can manage account settings (digest frequency, privacy)
- [x] Admins can manage user roles and verification status
- [x] Role-based access enforced (ROLE_USER, ROLE_VERIFIED, ROLE_ADMIN)
- [x] Unit tests passing; Docker image builds; `/health` passes

**Home UI + Auth Modal** ⚠️ — Issue #48
Labels: `frontend` `P0` `W2`
- [x] Users can sign up and log in via a modal; JWT stored in localStorage
- [ ] Auth Modal wired to real User Service backend (currently mock) *(carries to W4)*
- [x] Unauthenticated users are redirected to the auth modal
- [x] Home feed page layout: sidebar, topbar, topic filter bar, post cards
- [x] Settings modal: digest frequency and privacy toggles

**GenAI Service Foundation** ✅ — Issue #49
Labels: `genai` `P1` `W2`
- [x] FastAPI service configured with LangChain
- [x] Post summaries generated and returned as structured output
- [x] Tests passing; Dockerfile builds

**Database and Local Infrastructure Setup** ✅ — Issue #50
Labels: `infrastructure` `P0` `W2`
- [x] PostgreSQL initializes all service databases on first start
- [ ] MinIO provides S3-compatible storage for file uploads *(carries to W4)*
- [ ] Seed script creates test users, posts, and topics for manual testing *(carries to W4)*
- [x] All services confirm storage connectivity on startup

**Full CI Pipeline + Docker Improvements** ✅ — Issue #51
Labels: `infrastructure` `P0` `W2`
- [x] CI runs unit tests for all 3 backend services on every PR
- [x] Multi-stage Dockerfiles in use (smaller production images)
- [x] GitHub Actions dependency caching (Maven, pip, npm)
- [x] OpenAPI code generation runs in CI after spec lint

---

## Week 3 — IaC + Carry-over Resolution (May 25–31) ⚠️ PARTIAL

### 🏁 Milestone: W3 — Cloud Infrastructure Ready
> Due: May 31 | Status: ⚠️ Partial — content layer items carry over to W4

- [x] Azure VM provisioned via Terraform; services deployable via Ansible
- [x] Docker images built and pushed on every merge to dev
- [x] Ansible deployment triggers automatically after successful Docker build
- [ ] All services running on AET Kubernetes cluster via CD pipeline *(carries to W4)*
- [ ] Content creation and browsing working end-to-end *(carries to W4)*

---

### Backlog

**Cloud Deployment Deliverable** — Issue #74
Labels: `infrastructure` `P0` `W3`
- [x] Azure VM provisioned via Terraform (`infra/terraform/`)
- [x] Ansible playbooks deploy and configure all services (`infra/ansible/`)
- [x] Docker build + push to GHCR on merge to dev
- [x] Ansible deploy auto-triggers after successful Docker build
- [ ] Kubernetes manifests for all services (Deployment, Service, ConfigMap, Secret)
- [ ] Helm chart packaging all services
- [ ] CD pipeline deploys to AET K8s cluster via Helm on merge to dev
- [ ] Full deployment verified as reproducible from scratch

**Content Service** *(carry-over to W4)*
Labels: `backend` `P0` `W3`
- [ ] Authors can create, edit, and delete their own posts
- [ ] Feed supports topic filtering: unauthenticated → chronological results (Content Service); authenticated → engagement-ranked results for that topic (Recommendation Service)
- [ ] Users can comment on posts and reply to other comments
- [ ] Users can upvote posts and comments
- [ ] Users can bookmark posts and view their saved posts
- [ ] Full-text search across post content
- [ ] Post summary auto-generated by GenAI on creation
- [ ] Unit and integration tests passing; Docker image builds

**Feed and Post Pages** *(carry-over to W4)*
Labels: `frontend` `P0` `W3`
- [ ] Home feed displays real posts from Content Service
- [ ] Topic filter bar: selecting a topic shows engagement-ranked results for logged-in users (`/feed/trending?topic=`) or chronological results for guests (`/posts?topic=`); UI shows "For You" vs topic mode clearly
- [ ] Authors can write posts in a Markdown editor with topic input and cover image
- [ ] Post detail page shows full content, auto-generated AI summary, and vote controls
- [ ] Comment section supports threaded replies
- [ ] Authors can edit and delete their own posts and comments

---

## Week 4 — Content Layer + User Profile + Digest Setup (Jun 1–7) 🔄 ACTIVE

### 🏁 Milestone: W4 — Content + Auth End-to-End; Digest Preferences Saved
> Due: June 7 | Status: 🔄 Active

- [ ] Auth Modal sign-up and log-in working against real User Service
- [ ] MinIO storage and seed data script working locally
- [ ] Home feed displays real posts from Content Service; post detail shows auto-generated AI summary
- [ ] Digest topic preferences can be saved and retrieved per user
- [ ] All services deploy to AET K8s cluster via CD pipeline
- [ ] All W3 carry-over issues closed
- [ ] *(optional)* Post editor, user profile page, and Digest Management page complete

---

### Backlog

**Auth Modal — Backend Integration** *(carry-over from W2)*
Labels: `frontend` `P0` `W4`
- [ ] Auth Modal sign-up and log-in wired to real User Service (replace mock)
- [ ] JWT received from backend stored and attached to all subsequent API requests
- [ ] Protected routes verified against real JWT

**MinIO + Seed Data Setup** *(carry-over from W2)*
Labels: `infrastructure` `P0` `W4`
- [ ] MinIO provides S3-compatible storage for file uploads (post cover images, user avatars)
- [ ] Seed script creates test users, posts, topics, and comments for manual testing
- [ ] All services confirm storage connectivity on startup

**Resolve W3 Infrastructure Carry-overs**
Labels: `infrastructure` `P0` `W4`
- [ ] Kubernetes manifests and Helm chart complete for all services
- [ ] CD pipeline to AET K8s cluster working; close issue #74
- [ ] Full deployment verified as reproducible from scratch

**Content Service** *(carry-over from W3)*
Labels: `backend` `P0` `W4`
- [ ] Authors can create, edit, and delete their own posts
- [ ] Users can browse and filter the post feed by topic
- [ ] Users can comment on posts and reply to other comments
- [ ] Users can upvote posts and comments
- [ ] Users can bookmark posts and view their saved posts
- [ ] Full-text search across post content
- [ ] Post summary auto-generated by GenAI on creation (no manual trigger)
- [ ] DB schema fix: add `status` (DRAFT/PUBLISHED) and `avatar_url` fields
- [ ] Unit and integration tests passing; Docker image builds

**User Profile Page** *(optional — complete in W5 if not reached)*
Labels: `frontend` `P2` `W4`
- [ ] Users can view their own and other users' profiles (bio, expertise, links, post count)
- [ ] Users can edit their profile including avatar upload

**Feed and Post Pages** *(carry-over from W3)*
Labels: `frontend` `P0` `W4`
- [ ] Home feed displays real posts from Content Service
- [ ] Topic filter bar: selecting a topic shows engagement-ranked results for logged-in users (`/feed/trending?topic=`) or chronological results for guests (`/posts?topic=`); UI shows "For You" vs topic mode clearly
- [ ] Authors can write posts in a Markdown editor with topic input and cover image *(post editor — optional if not reached)*
- [ ] Post detail page shows full content, auto-generated AI summary, and vote controls
- [ ] Comment section supports threaded replies
- [ ] Authors can edit and delete their own posts and comments

**Digest Management — Topic Preferences** *(backend)*
Labels: `backend` `P0` `W4`
- [ ] Users can save a list of topics they are interested in
- [ ] Saved topic preferences are stored per user and retrievable by other services
- [ ] Preferences are available to GenAI for digest generation and to Recommendation Service for feed weighting

**Digest Management — Page** *(optional — complete in W5 if not reached)*
Labels: `frontend` `P2` `W4`
- [ ] Users can open the Digest Management page from the sidebar
- [ ] Users can search, add, and remove topics from their digest preferences
- [ ] Previously saved preferences are loaded and editable
- [ ] Past digests are listed and viewable (date, summary per subscribed topic)

**Daily Digest — Schema Design + Content Service Update**
Labels: `genai` `backend` `P1` `W4`
- [ ] Define Digest schema: digest record linked to user, date, subscribed topics, and generated content per topic
- [ ] Content Service updated to expose the data fields required for digest generation
- [ ] Schema reviewed by backend and GenAI tracks before W5 implementation begins

---

### 🔗 Integration — W4

- **Backend + Frontend**: register/login → profile view/edit tested end-to-end against real User Service
- **Backend + Frontend**: home feed wired to real Content Service; post creation form live
- **Backend + GenAI**: post summary auto-generated by GenAI on every new post creation
- **Backend + GenAI**: topic suggestions returned to the post editor from GenAI
- **All three**: `docker-compose up` brings all 5 services up; data flows verified between them

---

## Week 5 — Personalization + Recommendation (Jun 8–14) ⏳ UPCOMING

### 🏁 Milestone: W5 — Personalized Feed Live; Daily Digest Delivered
> Due: June 14 | Status: ⏳ Upcoming

- [ ] Homepage feed is weighted by the user's digest topic preferences
- [ ] Users receive a daily digest based on their selected topics
- [ ] Users receive in-app notifications for relevant activity
- [ ] All 4 services communicate correctly in the K8s cluster
- [ ] Prometheus metrics visible for all services

---

### Backlog

**Recommendation Service**
Labels: `backend` `P1` `W5`
- [ ] Homepage feed is ranked and weighted by the user's saved digest topic preferences
- [ ] Users receive notifications when someone comments on or upvotes their post, and when a new post appears in one of their subscribed topics
- [ ] User interactions (views, clicks, votes, bookmarks) are tracked to improve ranking over time

**Personalized Homepage + Notifications**
Labels: `frontend` `P1` `W5`
- [ ] Homepage feed default ("For You"): personalized via `/feed/personal` for logged-in users; chronological for guests
- [ ] Topic selected state ("Topic: X"): engagement-ranked via `/feed/trending?topic=` for logged-in users; chronological via `/posts?topic=` for guests — two modes are mutually exclusive, clearly indicated in UI
- [ ] Notification list shows new activity with mark-as-read and delete actions
- [ ] Digest Management page: today's generated digest is displayed under the preferences section

**Daily Digest Generation**
Labels: `genai` `P0` `W5`
- [ ] A daily digest is generated automatically (scheduled at 04:00) aggregating posts per subscribed topic
- [ ] Digest output is stored and accessible from the Digest Management page
- [ ] Digest uses live topic preferences from Recommendation Service
- [ ] Response caching avoids redundant LLM calls for the same content
- [ ] Tests covering digest generation and caching

**API Gateway + Prometheus**
Labels: `infrastructure` `P0` `W5`
- [ ] All external traffic routes through an API gateway (Traefik or NGINX)
- [ ] JWT validation centralised at the gateway level
- [ ] All services expose Prometheus metrics (request rate, latency, error rate)
- [ ] Prometheus scrape config covers all services including GenAI
- [ ] Metrics visible in Prometheus UI

---

### 🔗 Integration — W5

- **Backend + GenAI**: daily digest generation pulls live topic preferences from Recommendation Service
- **Backend + Frontend**: personalized feed connected to Recommendation Service on the homepage
- **Backend + Frontend**: notification list wired to real notification data
- **Frontend + GenAI**: Digest Management page displays real digest content from GenAI output
- **All three**: end-to-end journey — register → set digest topics → create post → receive digest

---

## Week 6 — New Features + Monitoring (Jun 15–21) ⏳ UPCOMING

### 🏁 Milestone: W6 — Verification Flow Live; Grafana Dashboards Committed
> Due: June 21 | Status: ⏳ Upcoming

- [ ] Users can apply for verified status; admins can approve or reject
- [ ] Admins can manage users and remove content
- [ ] Grafana dashboards showing per-service metrics committed to repo
- [ ] At least one alert rule configured and committed

---

### Backlog

**User Verification + Admin Panel** *(backend)*
Labels: `backend` `P1` `W6`
- [ ] Users can submit a verification request
- [ ] Admins can view pending requests and approve or reject them
- [ ] Approved users receive a VERIFIED badge visible on their profile and posts
- [ ] Admins can update user roles and ban/unban users
- [ ] Admins can remove posts that violate community guidelines

**User Verification + Admin Panel** *(frontend)*
Labels: `frontend` `P1` `W6`
- [ ] Users can submit a verification request from their profile page
- [ ] Verified badge is displayed on profiles and post cards
- [ ] Admin panel: list users, change roles, ban users, remove posts

**Grafana Dashboards + Alert Rules**
Labels: `infrastructure` `P0` `W6`
- [ ] Grafana dashboards showing per-service request rate, latency, and error rate
- [ ] GenAI service LLM call count and latency visible in dashboard
- [ ] At least one alert rule configured (e.g. service down or latency > 2 s)
- [ ] Dashboard JSON files and alert rule files committed to `infra/grafana/`

**P2 — Trending Feed** *(optional, if time permits)*
Labels: `backend` `frontend` `P2` `W6`
- [ ] A section or page surfaces posts gaining the most engagement recently
- [ ] Users can filter by past day or past week

---

### 🔗 Integration — W6

- **Backend + Frontend**: verification request → admin approval → badge appears on profile, end-to-end
- **Infra + All**: Grafana dashboards verified against live Prometheus data from the K8s cluster

---

## Week 7 — Final Integration + Demo (Jun 22–28) ⏳ UPCOMING

### 🏁 Milestone: W7 — Demo-Ready Platform
> Due: June 28 | Status: ⏳ Upcoming

- [ ] Full user journey works end-to-end: Register → Log in → Create post → View feed → Set digest topics → Receive digest → Comment → Vote → Bookmark
- [ ] All P0 pages are mobile-responsive with loading and error states handled
- [ ] Playwright E2E tests cover all critical flows
- [ ] CD pipeline deploys cleanly from `main` to K8s
- [ ] Grafana dashboards live and committed
- [ ] README final review complete
- [ ] Presentation slides and live demo rehearsed

---

### Backlog

**Full System Integration + Bug Fixes**
Labels: `all-tracks` `P0` `W7`
- [ ] Complete end-to-end user journey verified across all services
- [ ] Cross-service communication tested under realistic load
- [ ] All bugs found during integration fixed

**Frontend E2E Tests + Final Polish**
Labels: `frontend` `P0` `W7`
- [ ] All P0 pages complete and mobile-responsive
- [ ] Loading and error states handled throughout the app
- [ ] Playwright E2E tests: auth flow, post creation, feed, comments, digest management

**Final Deployment + Documentation**
Labels: `infrastructure` `P0` `W7`
- [ ] CD pipeline deploys cleanly from `main` to K8s
- [ ] Final README: local setup, architecture overview, API docs reference, CI/CD, monitoring, member responsibilities
- [ ] Presentation slides complete
- [ ] Live demo rehearsed by the full team

---

### 🔗 Integration — W7

- **All three**: full regression pass covering every P0 user story
- **All three**: demo walkthrough rehearsed — each member presents their track's contribution
