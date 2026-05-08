# Verita Project - Git Branching Guide

## Branch Structure Overview
```
main (protected) - [Production / Stable Release]
  ↑ 
  ↑ Release Merge (Every 2-3 weeks at Sprint end)
  │
dev (protected) - [Integration / Active Development]
  ↑ 
  │   ↑ PR Merge when task is complete
  │   │
  │   ├── feature/user-service (from dev)
  │   ├── feature/post-creation (from dev)
  │   ├── chore/docker-setup (from dev)
  │   ├── fix/login-error (from dev)
  │   ├── doc/api-spec (from dev)
  │   └── test/unit-tests (from dev)
```

### Branch Types

| Branch       | Lifetime  | Purpose                               | Merge Target |
| ------------ | --------- | ------------------------------------- | ------------ |
| `main`       | Permanent | Production-ready, stable releases     | -            |
| `dev`        | Permanent | Main integration branch for developers| `main`       |
| `feature/*`  | Temporary | New user-facing features              | `dev`        |
| `chore/*`    | Temporary | Setup, config, infra, tooling         | `dev`        |
| `fix/*`      | Temporary | Bug fixes                             | `dev`        |
| `doc/*`      | Temporary | Documentation updates                 | `dev`        |
| `test/*`     | Temporary | Adding or updating tests              | `dev`        |
| `refactor/*` | Temporary | Code restructuring (no logic change)  | `dev`        |

### Branch Protection Rules
- **`main`**: Require PR + 1 approval + CI passing
- **`dev`**: Require PR + 1 approval

---

## Standard Development Workflow

### Step 1: Create Your Branch
**Always start from the latest `dev` branch.**

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-task-name
```

### Step 2: Develop and Commit
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

```bash
git add .
git commit -m "feat: add user login endpoint"
git push -u origin feature/your-task-name
```

| Type | When to Use | Example |
|------|-------------|---------|
| `feat:` | New feature | `feat: add user authentication` |
| `fix:` | Bug fix | `fix: resolve CORS error` |
| `chore:` | Project setup/tooling | `chore: update dependencies` |
| `docs:` | Documentation only | `docs: add API specification` |
| `test:` | Add/update tests | `test: add unit tests for user service` |
| `refactor:` | Code restructure | `refactor: simplify auth logic` |
| `style:` | Code formatting | `style: fix indentation` |

### Step 3: Pull Request to `dev`
1. Open a Pull Request on GitHub.
2. **Base: `dev`** ← **Compare: `feature/your-task-name`**.
3. Ensure CI passes and obtain at least one team member's approval.
4. After merging, delete the remote and local feature branch.

---

## Integration: Merging to `main`

**Timing:** End of each Sprint (~2-3 weeks)

### Merge `dev` → `main` (Release)

On GitHub, create PR:
- Base: `main` ← Compare: `dev`
- Title: "Release Sprint 1"
- Requires: All team members' approval

---

## Important Rules
1. **No Shortcuts**: Never merge `feature/*` directly into `main`.
2. **Clean Integration**: Only verified and tested code enters `dev`.
