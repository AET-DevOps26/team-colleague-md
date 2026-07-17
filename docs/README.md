# Documentation

Index of Verita's project-wide documentation. Component and tooling docs live next to the
code they describe and are linked at the bottom.

**Start here:**
[Review Guide](review/Review_Guide.md) if you are reviewing/grading the project ·
[Local Development](contributing/Local_Development.md) if you are developing on it.

## review/

| Document | What's inside |
|---|---|
| [Review Guide](review/Review_Guide.md) | Reviewer walkthrough: explore checklist, health checks, API docs, monitoring |
| [Check List](review/Check_List.md) | Every Problem Statement user story versus what actually ships, verified by hand |
| [Team Responsibilities](review/Team_Responsibilities.md) | Who owned which area, derived from the pull-request history |

## architecture/

| Document | What's inside |
|---|---|
| [System Overview & Architecture](architecture/System_Overview_Architecture.md) | Services, technology decisions, data architecture, UML diagrams, product backlog |

## infrastructure/

| Document | What's inside |
|---|---|
| [Infrastructure Design](infrastructure/Infrastructure_Design.md) | The infra hub: environments, toolchain, CI/CD, Terraform/Ansible, Helm/Rancher |
| [API Gateway & Routing](infrastructure/API_Gateway_Routing.md) | Path-prefix routing pattern across local, Azure, and Kubernetes |
| [Seeding Remote Environments](infrastructure/Seeding_Remote_Environments.md) | Running the demo seed against verita-dev and the Azure VM |

## product/

| Document | What's inside |
|---|---|
| [Problem Statement](product/Problem_Statement.md) | The problem Verita solves, target users, and epics/user stories |
| [Frontend PRD](product/Frontend_PRD.md) | Product requirements for the web client |
| [Project Plan](product/Project_Plan.md) | Milestones, scope, and team plan |

## testing/

| Document | What's inside |
|---|---|
| [Testing Strategy](testing/Testing.md) | Platform-wide test tooling, coverage gates, and how to run tests per service |
| [Frontend Testing](testing/Frontend_Testing.md) | Unit, component, and end-to-end test layers for the frontend |

## contributing/

| Document | What's inside |
|---|---|
| [Local Development](contributing/Local_Development.md) | Prerequisites, backend infrastructure, seed data, per-service build & run |
| [Git Branching Guide](contributing/Git_Branching_Guide.md) | Branch naming and pull-request workflow |
| [GenAI Environment Setup](contributing/GenAI_Environment_Setup.md) | LLM provider keys and testing GenAI features via the admin panel |

## database/

| Document | What's inside |
|---|---|
| [Schema Overview](database/schema.md) | Database-per-service model and cross-service reference rules |
| [User Service Schema](database/user_service_schema.md) | `verita_users` tables |
| [Content Service Schema](database/content_service_schema.md) | `verita_contents` tables |
| [Recommendation Service Schema](database/recommendation_service_schema.md) | `verita_recommendations` tables |

## Other folders

- [`adr/`](adr/) — Architecture Decision Records (numbered, one decision per file)
- [`diagrams/`](diagrams/) — UML sources and exported images used by the architecture doc
- [`archive/`](archive/) — superseded or spent documents kept for the historical record

## Component & tooling docs (next to the code)

| Document | What's inside |
|---|---|
| [Frontend](../frontend/README.md) | React app — dev scripts, structure, design reference, tests |
| [Monitoring](../infra/monitoring/README.md) | Prometheus + Grafana stack for Compose and Kubernetes |
| [Helm Chart](../infra/helm/verita/README.md) | Kubernetes deployment via the `verita` umbrella chart |
| [API Client (Bruno)](../bruno/README.md) | Repo-level Bruno collection for exercising the APIs |
