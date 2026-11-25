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

## Authentication

The code is in `apps/backend/src/auth/`. What a person may do (sign-in,
invitations, password rules) is in
[`business_architecture_docs.md`](./business_architecture_docs.md) §4
"Access"; this section is how it works.

**Tokens and sessions.** Signing in creates a row in `auth_sessions` and sets
two HTTP-only cookies. No token is ever in a response body.

| Cookie | Lives (default) | Carries | Accepted while |
| :--- | :--- | :--- | :--- |
| `access_token` | 15 minutes, `ACCESS_TOKEN_EXPIRES_IN` | user, company, role, session id | its session exists, the user is active and the company isn't suspended (`AccessStrategy`) |
| `refresh_token` | 30 days, `REFRESH_TOKEN_EXPIRES_IN` | user, company, session id | it matches the hash its session stores (`AuthService.refreshAccessToken`) |

The two tokens use different secrets, and the backend refuses to start when
they are equal. A session stores only an HMAC-SHA256 of its refresh token,
keyed by `REFRESH_TOKEN_HASH_SECRET` and the session id.

**Refresh rotation.** Every refresh issues a new refresh token and swaps the
stored hash in one conditional update (`SessionService.rotateRefreshHash`), so
of two refreshes at the same moment only one rotates. The other arrives with
the previous token: within `REFRESH_TOKEN_REUSE_GRACE_MS` (30 seconds) of the
rotation it gets a new access token only, and any other reuse of an old token
deletes the session as stolen.

**What ends sessions.** Sign out deletes the session, and sign out everywhere
every session of the person. Changing a password deletes the other sessions
and keeps the current one; a password reset deletes them all and starts a new
one; deactivating someone deletes all of theirs. `AuthCleanupService` removes
expired sessions, and used or expired Google sign-up, Google link and
password-reset tokens, every night at 03:00.

**Guards and limits.** Three guards run for the whole app, in this order: the
rate limit, `AccessGuard`, then `RolesGuard` with the route's `@Role(...)`.
`app.http.spec.ts` calls every route signed out and expects a 401 from all but
the `@Public()` ones (the Google link callback redirects to Settings instead);
`route-roles.spec.ts` holds the roles of every route.
Requests are limited to 100 a minute per session; sign-in, sign-up and the
password routes have tighter limits per client address and per account
(`auth/rate-limit/`).

**Google.** Four OAuth flows, each with its own strategy, callback URL and
state cookie: sign-in, sign-up (the only one that may start a company),
linking from Settings, and accepting an invitation (in `invitations/`). Every
flow refuses an address Google hasn't verified. A callback signs in an account
already linked, or redirects to the frontend with a one-time token, to confirm
a link with the account's password or to name a new company, which a
`…/complete` route then uses. A failed callback returns to the page the flow
started from with `?error=<code>`, and the frontend turns the code into text
(`apps/frontend/lib/constants/auth-errors.ts`).

**One-time tokens.** Google sign-up and link tokens, password-reset tokens and
invitation tokens are random, short-lived, single-use and stored only as
SHA-256 hashes. Each is used inside a transaction, so a completion that fails
(a wrong password, a missing name) rolls back and the link still works.

**Passwords.** Hashed with scrypt
(`apps/backend/src/lib/utils/hash-password.util.ts`) and compared in constant
time (`PasswordService`). A hash takes about 128 MiB, so hashes run one at a
time and the rest wait. A flow that takes a one-time token checks it
before hashing, so a made-up token costs no hash, and hashes before its
transaction, which checks the token again as it uses it up; a hash inside a
transaction would hold its database connection while it waits.

**On the frontend.** The browser reaches the backend only through
`/api/backend/*` on the frontend's domain ([`workflow.md`](./workflow.md)), so
the cookies belong to the frontend. Two places renew an expired access token:
`apps/frontend/proxy.ts` before a page renders, and `apiClient`
(`apps/frontend/lib/api/core/http-client.ts`) when a data request gets a 401,
with one shared refresh and one retry. Link Google in Settings renews the
session itself before it leaves for Google, since that route is a page load. Only a refused refresh (401) ends the session; a
throttled refresh or a backend that can't be reached is an ordinary failed
request. `basicClient` never refreshes, so it is only for routes that need no
session, such as sign-in, sign-up and reset.

**Rules any change must keep.**

- Every token points to a live session, and its session, user and company
  belong together.
- Refresh tokens are rotated and stored only as session-bound hashes; one-time
  tokens are stored only as hashes.
- An inactive person or a suspended company can't sign in, refresh or use a
  session, and sign-in reveals that status only after a correct password.
- Linking Google needs a matching email (when signed in) or the account's
  password.
- The API accepts JSON bodies only, which keeps a form on another site from
  signing a browser in.

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
| Anything touching login or sessions | [Authentication](#authentication) above, then `apps/backend/src/auth/` |
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
