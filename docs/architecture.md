# WorkTrack Architecture

Start here. This page gives the shape of the system and points at the detailed
documents; it deliberately does not repeat them.

## What the project is

A multi-tenant time-tracking application. A company signs up, invites users,
defines projects and activities, and its employees log time against the
project/activity pairs they are assigned to. Managers and owners get wider
visibility over that data.

Everything is scoped to a **company** — the tenant root. Users, teams, projects,
activities and every time entry carry a `companyId`, and isolation is enforced
in the backend services on every query.

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

`OWNER | MANAGER | EMPLOYEE`. Owners administer the company, managers administer
resources and see the people in teams they lead, employees log their own time.

The rule worth internalising: **read visibility widens with role, write
ownership never does.** No role can create, edit or delete another user's time
log.

## Documentation map

| Document | Covers |
| :--- | :--- |
| [`README.md`](../README.md) | Setup, commands, environment |
| [`apps/backend/docs/backend-context.md`](../apps/backend/docs/backend-context.md) | Domain modules, API surface, data model, roles, business rules |
| [`apps/backend/docs/auth.md`](../apps/backend/docs/auth.md) | Tokens, sessions, guards, Google OAuth, password flows |
| [`apps/frontend/docs/frontend-context.md`](../apps/frontend/docs/frontend-context.md) | Routing, data layer, design tokens, shared components |
| [`CLAUDE.md`](../CLAUDE.md) | Coding conventions and workflow rules |
| [`docs/business_architecture_docs.md`](./business_architecture_docs.md) | Product definition, business rules, agreed decisions, roadmap |
| [`docs/current-scope.md`](./current-scope.md) | The next implementation scope — what to build now |

## Where to start for a given task

| Task | Read |
| :--- | :--- |
| Add or change an API endpoint | `backend-context.md` → the module, then its service |
| Change who can see or do what | `backend-context.md` → Roles, then `applyUserVisibility` |
| Anything touching login or sessions | `auth.md` |
| Build a screen | `frontend-context.md` → Data layer + Shared components |
| Change colours or styling | `frontend-context.md` → Visual foundation, then `globals.css` |
| Schema change | `backend-context.md` → Data model, then `src/migrations/` |

## Current state

The employee timesheet is complete: logging, editing and deleting time against
assigned projects, driven by company work settings, with full loading, error and
empty states. Admin CRUD exists for users, teams, projects, activities and
categories.

Not built yet: any manager or owner view of team time, and any frontend for the
backend's `planning` and `reporting` modules.

Test coverage has started but is narrow: one suite,
`team-visibility.service.spec.ts`, covering the role-visibility filters against
a real database. There is no CI yet, so nothing runs it automatically. The
backend has a production image (`apps/backend/Dockerfile`); the frontend has
none by design, because it is built by its host.

See [`business_architecture_docs.md`](./business_architecture_docs.md) §6 for a
fuller assessment and §7 for the order the remaining work should be built in.
