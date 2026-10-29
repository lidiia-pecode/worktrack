# WorkTrack

WorkTrack is a full-stack time tracking application for a single services company. Employees log working hours against the projects they are assigned to, and managers and owners get visibility into projects, teams and where the time went.

The project is organized as a **monorepo**, containing both the frontend and backend applications. Locally both apps run on your machine and only PostgreSQL runs in Docker.

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- NestJS
- TypeORM
- PostgreSQL
- JWT Authentication

### Development

- npm Workspaces
- Docker Compose (PostgreSQL only)
- Makefile

## Project Structure

```text
worktrack/
├── apps/
│   ├── frontend/
│   └── backend/
├── docker-compose.dev.yml
├── Makefile
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 22 (see `.nvmrc`) and npm
- Docker with Docker Compose, for PostgreSQL. On macOS with colima, 2 CPUs and
  2 GB are plenty: `colima start --cpu 2 --memory 2`

### Installation

Install dependencies:

```bash
npm install
```

Create the env files from the samples. The sample values work as they are for
local development; [Environment Variables](#environment-variables) explains them:

```bash
cp .env.sample .env                          # Postgres credentials for Docker
cp apps/backend/.env.sample apps/backend/.env
cp apps/frontend/.env.sample apps/frontend/.env
```

For the first project setup (or after resetting the database), create the
schema and the test data:

```bash
make setup
```

This starts PostgreSQL, runs all database migrations and seeds one test company
with users, projects, activities, teams, planning, time logs and absences.

`make seed` creates the **WorkTrack Demo** company: the accounts for checking
each role (an owner, two managers and employees) and about thirty-five demo
people in several teams, with projects, activities and categories, including
archived and deactivated ones and long names. For Reports it adds time,
plans and absences from 1 July 2026 up to yesterday, the same on every reset
for July to September; the company starts in June, which stays empty. Running
it again adds only what is missing, and the history only into a database that
has none; to rebuild everything, run `make down-hard` and then `make setup`. The logins are written to `apps/backend/docs/TEST-CREDENTIALS.md`
(ignored by Git) every time you seed. To change what gets created, edit
`apps/backend/src/seed/seed-config.ts` and re-run `make seed`.

The seed writes only to a local database: it stops before connecting when
`NODE_ENV` is `production`, `DATABASE_SSL` is `true`, or the database host is
not `localhost`, `127.0.0.1` or `::1`, so it can never run against Neon.

### Running

```bash
make dev
```

This starts PostgreSQL in Docker, then the backend (<http://localhost:3001>)
and the frontend (<http://localhost:3000>) in the same terminal, each line
prefixed with the app it came from. Both reload on file changes. `Ctrl+C` stops
the two apps; PostgreSQL keeps running until `make down`.

After pulling a change to `package.json` or `package-lock.json`, run
`npm install` again.

## Available Commands

```bash
make dev        # Start PostgreSQL, then the backend and frontend; Ctrl+C stops the apps
make db         # Start PostgreSQL only
make down       # Stop PostgreSQL, keep its data
make down-hard  # Stop PostgreSQL and delete its data
make migrate    # Run database migrations
make migrate-neon  # Dry run of pending migrations against Neon; APPLY=1 applies (see docs/workflow.md)
make seed       # Seed the test company and write TEST-CREDENTIALS.md
make init       # Run migrations and seed data
make setup      # First-time project setup (same as init)
make test       # Run backend tests against the local database
```

The same checks CI runs are available from the repository root. Each fans out
across both applications, skipping any that does not define the script:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
```

The backend tests run against the local database; `make test` starts
PostgreSQL first if it is not running. Each spec keeps to its own throwaway company, so your
data is safe; [`docs/workflow.md`](docs/workflow.md) has the details. The
frontend tests run anywhere:

```bash
make test                          # backend
npm run test -w apps/frontend      # frontend
```

## Environment Variables

Each application manages its own environment configuration, copied from its
sample during setup. The samples list every variable, marked required or
optional, and are the contract for what a deployment needs. The backend
validates them at startup and refuses to boot if a required one is missing.

Worth knowing:

- The root `.env` sets the Postgres container's credentials. They must match
  `DB_USERNAME`, `DB_PASSWORD` and `DB_NAME` in `apps/backend/.env`.
- The container publishes PostgreSQL on port **5433**, not 5432, so a PostgreSQL
  installed on the machine (Homebrew, Postgres.app) can keep 5432. The backend
  sample already uses `DB_PORT=5433`.
- Hosted databases hand out a single connection URL instead of separate values.
  Set `DATABASE_URL` (and `DATABASE_SSL=true`) and the discrete `DB_*` variables
  are ignored.
- The Google and Resend values in the sample are placeholders. They let the
  backend start, and signing in with a password works, but signing in with
  Google and sending email (invitations, password reset) fail until you put in
  your own keys.

## Contributing

`main` is protected — direct pushes are rejected. Branch off `main`, open a pull
request, and merge it with **Squash and merge** once the `Frontend` and
`Backend` checks pass.

```bash
git checkout main && git pull
git checkout -b feat/short-description
git push -u origin feat/short-description
gh pr create
```

[`docs/workflow.md`](docs/workflow.md) has the full loop, the branch naming, what
CI runs, and the rules for changes that touch the database.

## Documentation

| Document                                                                           | Covers                                                 |
| :--------------------------------------------------------------------------------- | :----------------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md)                                     | System shape, request flow, where to start a task      |
| [`docs/business_architecture_docs.md`](docs/business_architecture_docs.md)         | Product definition, business rules, decisions, roadmap |
| [`docs/permission-model.md`](docs/permission-model.md)                             | The permission model and the scopes that delivered it  |
| [`docs/workflow.md`](docs/workflow.md)                                             | Branching, pull requests, CI, database changes         |

A local checkout also carries working documents that are deliberately kept out
of version control and so are not listed above: the active scope, the defects
and debt no scope owns, a product assessment against comparable tools, context
notes for the backend and the frontend, and the repository's coding
conventions.

The backend serves Swagger at <http://localhost:3001/api/docs> when running.
It is off in production unless `ENABLE_SWAGGER=true` is set.

## Current Status

Under active development. The employee timesheet, the owner/manager team time
view, absences, capacity and expected hours, planning, reporting with an Excel
export of hours, each person's own month on My time, and the Manage pages for
users, teams, projects, activities and categories are implemented, and a new
company is guided from sign-up to somebody logging time.

The original feature plan is complete. The work ahead improves the product
itself, area by area: first run and onboarding, the application shell and shared
UI, administration and settings, everyday time entry, team oversight and
planning, reporting and the employee's own view have each had a pass, followed
by a round of fixes across them; a whole-product review remains. A production launch comes last, once the product
is ready. The roadmap, test coverage and engineering state are in
[`docs/business_architecture_docs.md`](docs/business_architecture_docs.md) §6
and §7.

The backend has a production Docker image (`apps/backend/Dockerfile`).
Migrations are run by hand, not as a deployment step; a real release step is
part of the production launch. Pull requests are checked by GitHub Actions and
by a Vercel preview build, and `main` is protected. A shared development stand
is deployed — Vercel for the frontend, Render for the backend, Neon for the
database; see [`docs/workflow.md`](docs/workflow.md). There is no production
environment yet.
