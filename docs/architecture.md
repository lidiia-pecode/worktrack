# WorkTrack Architecture

The shape of the system and where to start a task. The
[README](../README.md#documentation) lists every document; this page
deliberately does not repeat them.

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

npm-workspaces monorepo. Locally both apps run on the machine and only
PostgreSQL runs in Docker Compose (`make dev`).

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

Auth state lives in HTTP-only cookies. Access tokens are short-lived (15 minutes
by default) and refreshed by rotation; refresh tokens are stored only as
session-bound HMAC hashes.

## Roles

`OWNER | MANAGER | EMPLOYEE`. Owners administer the company and own its
structure — who exists, which teams exist and who leads them. Managers run the
teams they were given and see the people in them. Employees log their own time.

The rule worth internalising: **write access to a time entry matches read
visibility** — owners company-wide, managers within the teams they lead, on
the days the person was in them, employees themselves. This is D9 in
[`business_architecture_docs.md`](./business_architecture_docs.md), and it is
enforced in `TimeLogsService`.

## Where to start for a given task

| Task | Read |
| :--- | :--- |
| Add or change an API endpoint | `apps/backend/src/<module>/` — the controller, then its service |
| Change who can see or do what | `TeamVisibilityService`, then whichever service calls it |
| Anything touching login or sessions | `apps/backend/src/auth/` |
| Build a screen | `apps/frontend/app/` — the route, then `app/components/shared` |
| Change colours or styling | `apps/frontend/app/globals.css` |
| Schema change | the entity, then `apps/backend/src/migrations/`; [`workflow.md`](./workflow.md) for getting it onto Neon |
| Get a change reviewed and merged | [`workflow.md`](./workflow.md) |

## Current state

What the product does today, its test coverage and engineering state are in
[`business_architecture_docs.md`](./business_architecture_docs.md) §6, and the
roadmap in §7. The permission model, all of it enforced, is in
[`permission-model.md`](./permission-model.md).
