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

`AccessGuard` and `RolesGuard` run for every route, after the rate limit, so a
route needs a session unless it is marked `@Public()`.

Auth state lives in HTTP-only cookies, never in a response body. Access tokens are short-lived (15 minutes
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

## Screens

The name a screen has in the app, its route under `apps/frontend/app/`, and
the folder under `app/components/` that holds it.

| In the app | Route | Components | Who |
| :--- | :--- | :--- | :--- |
| Team time | `/team` | `team` | owner, manager |
| Planning | `/planning` | `planning` | owner, manager |
| Reports | `/reports` | `reports` | owner, manager |
| Log my time | `/timesheet` | `timesheet` | everyone |
| Review my time | `/my-time` | `my-time` | everyone |
| Manage → People | `/admin/users` | `users` | owner, manager |
| Manage → Projects | `/admin/projects` | `projects` | owner, manager |
| Manage → Teams | `/admin/teams` | `teams` | owner |
| Manage → Activities | `/admin/activities` | `activities` | owner |
| Manage → Categories | `/admin/categories` | `categories` | owner |
| Manage → Periods | `/admin/periods` | `periods` | owner |
| Getting started | `/getting-started` | `onboarding` | everyone |
| Settings | `/settings` | `settings` | everyone |
| Setup wizard | `/onboarding` | `onboarding` | owner |

## Names that differ between the app and the code

- **Team time and Teams.** `/team` is the week of a manager's people; the
  Teams page, where the owner sets teams up, is `/admin/teams`.
- **Manage** is the menu group for every `/admin/*` page; **People** is
  `/admin/users`.
- **Working hours** are `Capacity` in the code (`UserCapacity`, the
  `capacity` module); the company's standard day is `CompanyStandardDay`.
- **A category** is `ActCategory`, in the `activity-categories` module.
- **Deactivate and Reactivate** are the `archive` and `unarchive` routes of a
  user.
- **`proxy.ts`** is what Next.js calls middleware: it runs before every page.
- **`components/ui`** holds the generic building blocks (button, dialog,
  input); **`app/components`** holds WorkTrack's own screens and the parts
  they share (`app/components/shared`).
- **`lib/constants/time-zones.generated.ts`** is written by
  `npm run generate:time-zones` in `apps/frontend`, never by hand.

## Current state

What the product does today, its test coverage and engineering state are in
[`business_architecture_docs.md`](./business_architecture_docs.md) §6. The
permission model, all of it enforced, is in
[`permission-model.md`](./permission-model.md).
