# WorkTrack Architecture

Start here. This page gives the shape of the system and points at the detailed
documents; it deliberately does not repeat them.

## What the project is

A time-tracking application for one services company. It signs up, invites
users, defines projects and activities, and its employees log time against the
project/activity pairs they are assigned to. Managers and owners get wider
visibility over that data.

Everything is scoped to a **company** — the tenant root. Users, teams, projects,
activities and every time entry carry a `companyId`, and isolation is enforced
in the backend services on every query. The data model is therefore multi-tenant,
but a multi-company SaaS product is explicitly not a goal — see
[`business_architecture_docs.md`](./business_architecture_docs.md) §1.

## Shape

npm-workspaces monorepo, run locally with Docker Compose.

```text
worktrack/
├── apps/
│   ├── backend/    NestJS 11 · TypeORM 0.3 · PostgreSQL 16   :3001
│   └── frontend/   Next.js 16 · React 19 · Tailwind v4       :3000
├── docker-compose.dev.yml
├── Makefile
└── docs/
```

## Request flow

```text
Browser
  │
  ├─ page request ──► proxy.ts (Next middleware)
  │                     · refreshes expired access tokens transparently
  │                     · route guards, redirects to /login
  │                   └─► Server Component ──► getCurrentUser() ──► GET /users/me
  │
  └─ data request ──► apiClient (TanStack Query)
                        · retries once on 401 behind a single-flight refresh
                      └─► NestJS ──► AccessGuard ──► RolesGuard ──► service
                                                                      · tenant filter
                                                                      · role visibility
                                                                      · business rules
```

Auth state lives in HTTP-only cookies. Access tokens are short-lived (1 minute
by default) and refreshed by rotation; refresh tokens are stored only as
session-bound HMAC hashes.

## Roles

`OWNER | MANAGER | EMPLOYEE`. Owners administer the company and own its
structure — who exists, which teams exist and who leads them. Managers run the
teams they were given and see the people in them. Employees log their own time.

The rule worth internalising: **write access to a time entry matches read
visibility** — owners company-wide, managers within the teams they lead,
employees themselves. This is D9 in
[`business_architecture_docs.md`](./business_architecture_docs.md), and it is
enforced in `TimeLogsService`.

## Documentation map

| Document | Covers |
| :--- | :--- |
| [`README.md`](../README.md) | Setup, commands, environment |
| [`apps/backend/docs/backend-context.md`](../apps/backend/docs/backend-context.md) | Domain modules, API surface, data model, roles, business rules |
| [`apps/backend/docs/auth.md`](../apps/backend/docs/auth.md) | Tokens, sessions, guards, Google OAuth, password flows |
| [`apps/frontend/docs/frontend-context.md`](../apps/frontend/docs/frontend-context.md) | Routing, data layer, design tokens, shared components |
| [`CLAUDE.md`](../CLAUDE.md) | Coding conventions and workflow rules |
| [`docs/business_architecture_docs.md`](./business_architecture_docs.md) | Product definition, business rules, agreed decisions, roadmap |
| [`docs/permission-model.md`](./permission-model.md) | Target permission model and the scopes delivering it; partly built |
| [`docs/known-issues.md`](./known-issues.md) | Defects and debt that no current scope owns |
| [`docs/current-scope.md`](./current-scope.md) | The next implementation scope — what to build now |
| [`docs/workflow.md`](./workflow.md) | Branching, pull requests, CI, database changes |

## Where to start for a given task

| Task | Read |
| :--- | :--- |
| Add or change an API endpoint | `backend-context.md` → the module, then its service |
| Change who can see or do what | `backend-context.md` → Roles, then `applyUserVisibility` |
| Anything touching login or sessions | `auth.md` |
| Build a screen | `frontend-context.md` → Data layer + Shared components |
| Change colours or styling | `frontend-context.md` → Visual foundation, then `globals.css` |
| Schema change | `backend-context.md` → Data model, then `src/migrations/` |
| Get a change reviewed and merged | `workflow.md` |

## Current state

The employee timesheet is complete: logging, editing and deleting time against
assigned projects, driven by company work settings, with full loading, error and
empty states. Admin CRUD exists for users, teams, projects, activities and
categories. Owners and managers have a team time view at `/team` — a week grid
filtered by team and project, with a per-person panel they can edit through.

Not built yet: any frontend for the backend's `planning` and `reporting`
modules, and project membership is still assigned without a permission check —
that is the next scope, [`current-scope.md`](./current-scope.md).

Test coverage has started but is narrow: seven suites and 93 tests, covering the
role-visibility filters, the team route roles and membership rules, who may
invite whom into which team, what accepting an invitation creates, the time-log
write scope and the user-list scope — mostly against a real database. GitHub Actions runs them, along with lint, typecheck and build
for both applications, on every pull request. The backend has a production image
(`apps/backend/Dockerfile`); the frontend has none by design, because it is
built by its host.

See [`business_architecture_docs.md`](./business_architecture_docs.md) §6 for a
fuller assessment and §7 for the order the remaining work should be built in.
The target permission model is in
[`permission-model.md`](./permission-model.md); its §5 says which parts of it
are enforced today and which are still ahead.
