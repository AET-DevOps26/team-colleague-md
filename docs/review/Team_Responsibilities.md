# Team Responsibilities

Who did what on Verita. Derived from the pull-request history (PR #7 → #208) across the
seven-week project. Everyone reviewed each other's PRs; the table lists primary ownership.

## Team

| Member | GitHub | Focus |
|---|---|---|
| Yaxuan Chen | [@MichaelChennn](https://github.com/MichaelChennn) | Frontend, integration, infrastructure & releases |
| Arpad Horvath | [@Arpad-H](https://github.com/Arpad-H) | Backend services, Kubernetes/Helm, monitoring |
| Wenjie Zhu | [@ByudH](https://github.com/ByudH) | GenAI service, storage, seeding |

## Ownership by area

| Area | Owner | Main contributions |
|---|---|---|
| Frontend (React app) | Yaxuan | Home feed, post detail, post editor, user profile, auth & settings modals, digest and topic UI, admin panel, 404 page, Playwright e2e suite |
| Frontend ↔ backend integration | All three | Axios service layer, in-memory token store & silent refresh, feed/profile/digest/topic/comment wiring, removal of demo/mock mode |
| user-service | Arpad | Spring Boot scaffolding, authentication endpoints, Flyway migrations, password reset |
| content-service | Arpad / Wenjie | Service scaffolding, post/comment endpoints, OpenAPI spec alignment |
| recommendation-service | Arpad / Yaxuan | Service scaffolding and endpoints |
| Backend cross-cutting | Yaxuan / Wenjie | Standardized service layout (ADR-0004), Lombok + Javadoc, cross-service user-deletion cleanup, digest as a standalone entity (ADR-0019), profile counter write-back |
| GenAI service | Wenjie | FastAPI service, post summarization, daily digest API, digest cron job, external content sources, multi-provider LLM support |
| Object storage (MinIO) | Wenjie | MinIO configuration and avatar upload |
| Seed data | Wenjie / Yaxuan | User seeding, content & recommendation seeding, `--reset` purge, remote seeding for Rancher and the Azure VM |
| Infrastructure as Code | All three | Terraform + Ansible for the Azure VM, deployment hardening, environment/URL configuration |
| Kubernetes & Helm | Arpad / Yaxuan | Helm umbrella chart and Rancher deploy (Arpad); quota fixes, single ingress with nginx as API gateway (Yaxuan) |
| Monitoring | Arpad | Prometheus + Grafana observability stack |
| CI/CD | All three | GitHub Actions per service, image tagging & deploy triggers, secret handling, Helm CI, Java 25 upgrade |
| Testing | Arpad / Yaxuan | Backend test suites for all three services (Arpad); frontend Playwright layers and the 3-layer digest suite (Yaxuan) |
| Documentation & ADRs | Yaxuan | Architecture overview, problem statement, PRD, project plan, ADR-0001…0020, infrastructure docs, review guide & check list |
| API specs (OpenAPI) | Arpad / Yaxuan | Initial specs per service (Arpad); alignment with the class diagram and frontend needs (Yaxuan) |
| Release management | Yaxuan | Weekly `dev` → `main` releases, branching guide, PR/issue templates, history reconvergence |

## Timeline highlights

| Weeks | Milestone |
|---|---|
| 1–2 | Problem statement, architecture, UML, OpenAPI specs, Docker Compose |
| 3 | Frontend UI foundation, Spring scaffolding, CI workflows, IaC on Azure |
| 4 | Auth end-to-end, user profile, GenAI summarization, MinIO, Helm/K8s |
| 5 | Feed integration, digest UI, avatar upload, monitoring, service tests |
| 6 | Digest cron job, remote seeding, cross-service deletion, API gateway |
| 7 | Digest as standalone entity, admin panel + GenAI ops, password reset, docs polish |

## References

- [Review Guide](Review_Guide.md) — how to run and explore the project
- [Check List](Check_List.md) — promised user stories versus what ships, verified by hand
- [Project Plan](../product/Project_Plan.md) — milestones and scope
