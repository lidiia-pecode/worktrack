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
visibility** — owners company-wide, managers within the teams they lead,
employees themselves. This is D9 in
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

The employee timesheet is complete: logging, editing and deleting time against
assigned projects, driven by company work settings, with full loading, error and
empty states. The Manage pages show users, teams, projects, activities and
categories as searchable lists that open a shared side panel. Owners and managers have a team time view at `/team` — a week grid
whose cells list each day's entries, edited in place, searchable, sortable and
filtered by team and project.

Absences are built: a person records days away as a date range with a type, an
owner or manager can record them for somebody from the team view, and the
timesheet and the team view mark those days, so a week with no logged time
says why. A day is either worked or absent, never both.

Expected hours are capacity minus absences, and owners and managers plan their
people's week by project at `/planning`, against the hours each person has
available. Each month locks by itself a week after it ends, and an owner can
reopen one at `/admin/periods`. Owners and managers read an overview of
logged, planned and expected hours at `/reports`, and download hours as an
Excel file for invoicing. The authorization gaps are all closed. The work
ahead is making it a better product; a production launch comes last, once it
is ready.

See [`business_architecture_docs.md`](./business_architecture_docs.md) §6 for a
fuller assessment, test coverage and the engineering state, and §7 for the
roadmap. The permission model, all of it
enforced, is in [`permission-model.md`](./permission-model.md).
