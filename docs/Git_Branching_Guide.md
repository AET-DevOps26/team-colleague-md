# Verita Project - Git Branching Guide

## Branch Structure Overview
```
main (protected)
  ↑ Every 2-3 weeks (Sprint end)
  │
  ├── dev (long-lived, protected)
  │   ↑ When feature/fix/chore is complete
  │   │
  │   ├── feature/user-service (short-lived)
  │   ├── feature/post-creation (short-lived)
  │   ├── chore/docker-setup (short-lived)
  │   ├── chore/ci-config (short-lived)
  │   ├── fix/login-error (short-lived)
  │   ├── fix/cors-issue (short-lived)
  │   ├── test/unit-tests (short-lived)
  │   └── refactor/auth-logic (short-lived)
  │
  └── docs (long-lived, protected)
      ↑ When documentation is ready
      │
      ├── doc/api-spec (short-lived)
      ├── doc/architecture-diagrams (short-lived)
      └── doc/database-schema (short-lived)
```

### Branch Types

| Branch       | Lifetime  | Purpose                               | Merge Target |
| ------------ | --------- | ------------------------------------- | ------------ |
| `main`       | Permanent | Production-ready code + docs          | -            |
| `dev`        | Permanent | Integration branch for code           | `main`       |
| `docs`       | Permanent | Integration branch for documentation  | `main`       |
| `feature/*`  | Temporary | New user-facing features              | `dev`        |
| `chore/*`    | Temporary | Project setup, configuration, tooling | `dev`        |
| `fix/*`      | Temporary | Bug fixes                             | `dev`        |
| `doc/*`      | Temporary | Documentation tasks                   | `docs`       |
| `test/*`     | Temporary | Adding or updating tests              | `dev`        |
| `refactor/*` | Temporary | Code restructuring                    | `dev`        |

**Examples:**
```bash
feature/user-authentication
chore/docker-setup
fix/login-button
doc/api-specification
test/user-service-tests
refactor/simplify-auth
```

### Branch Protection Rules
- **`main`**: Require PR + 1 approval + CI passing
- **`dev`**: Require PR + 1 approval
- **`docs`**: Require PR + 1 approval
- **Short-lived branches**: No restrictions

---

## Standard Workflow

This workflow applies to all short-lived branches (feature/, chore/, fix/, doc/, test/, etc.). The only difference is the base branch:
- Code-related branches → merge to `dev`
- Documentation branches → merge to `docs`

### Step 1: Create Your Branch

```bash
# For code work: create from dev
git checkout dev
git pull origin dev
git checkout -b feature/user-service  # or chore/, fix/, test/

# For documentation: create from docs
git checkout docs
git pull origin docs
git checkout -b doc/api-spec

# Push to remote
git push -u origin <branch-name>
```

### Step 2: Develop and Commit

```bash
# Make your changes
# ...

# Stage and commit with conventional commit message
git add .
git commit -m "feat: implement user registration endpoint"
# Other prefixes: chore:, fix:, docs:, test:, refactor:

# Push to your branch
git push origin <branch-name>
```

### Step 3: Create Pull Request

On GitHub:

1. Go to your repository
2. Click "Pull requests" → "New pull request"
3. Select base branch:
   - Code branches → Base: `dev`
   - Doc branches → Base: `docs`
4. Compare: `<your-branch-name>`
5. Add title and description
6. Request review from team members
7. Wait for approval (and CI to pass for code)

### Step 4: After Merge - Delete Branch - Ask Before

```bash
# After PR is merged, clean up
git checkout dev  # or docs
git pull origin dev  # or docs
git branch -d <branch-name>
git push origin --delete <branch-name>
```

---

## Integration: Merging to `main`

**Timing:** End of each Sprint (~2-3 weeks)

### Merge `dev` → `main` (Code Release)

On GitHub, create PR:
- Base: `main` ← Compare: `dev`
- Title: "Release Sprint 1 - Code Features"
- Requires: All team members' approval

### Merge `docs` → `main` (Documentation Release)

On GitHub, create PR:
- Base: `main` ← Compare: `docs`
- Title: "Release Sprint 1 - Documentation"
- Requires: All team members' approval

---

## Commit Message Convention

Follow Conventional Commits format: `<type>: <description>`

| Type | When to Use | Example |
|------|-------------|---------|
| `feat:` | New feature | `feat: add user authentication` |
| `fix:` | Bug fix | `fix: resolve CORS error` |
| `chore:` | Project setup/tooling | `chore: update dependencies` |
| `docs:` | Documentation only | `docs: add API specification` |
| `test:` | Add/update tests | `test: add unit tests for user service` |
| `refactor:` | Code restructure | `refactor: simplify auth logic` |
| `style:` | Code formatting | `style: fix indentation` |

---

## Important Rules

### DO:

- Always create branches from `dev` or `docs`
- Keep branches small (< 1 week work)
- Use conventional commit messages
- Delete branches after merging
- Pull latest changes before creating new branches

### DON'T:

- Never commit directly to `main`, `dev`, or `docs`
- Don't let branches live > 1 week
- Don't merge without PR review
- Don't force push to shared branches

---

## Common Scenarios

### Scenario 1: Update My Branch with Latest Changes

```bash
# If base branch has new changes while you're working
git checkout feature/user-service
git fetch origin
git merge origin/dev  # or origin/docs for doc branches

# Resolve conflicts if any, then:
git push origin feature/user-service
```

### Scenario 2: Fix Conflicts Before Merge

```bash
# If GitHub shows conflicts on your PR
git checkout feature/user-service
git fetch origin
git merge origin/dev

# Fix conflicts in your editor
git add .
git commit -m "fix: resolve merge conflicts"
git push origin feature/user-service
```

### Scenario 3: Committed to Wrong Branch

```bash
# If you accidentally committed to dev:
git checkout dev
git log  # Find the commit hash

git checkout -b feature/my-fix
git cherry-pick <commit-hash>
git push -u origin feature/my-fix

# Undo on dev (use with caution):
git checkout dev
git reset --hard HEAD~1
git push origin dev --force
```

---

## Quick Reference Commands

```bash
# Check current branch
git branch

# Check status
git status

# View commit history
git log --oneline --graph --all

# Sync with remote
git fetch origin
git pull origin <branch-name>

# List all branches (local and remote)
git branch -a

# Delete local branch
git branch -d <branch-name>

# Delete remote branch
git push origin --delete <branch-name>
```

---
