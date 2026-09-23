# WorkTrack

WorkTrack is a full-stack time tracking application for a single services company. Employees log working hours against the projects they are assigned to, and managers and owners get visibility into projects, teams and where the time went.

The project is organized as a **monorepo**, containing both the frontend and backend applications, along with shared Docker configuration for local development.

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

- Docker & Docker Compose
- Makefile
- npm Workspaces

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

- Node.js
- Docker & Docker Compose
- npm

### Installation

Install dependencies:

```bash
npm install
```

> Stop the containers before installing on your machine. `npm install` and
> `npm ci` replace `node_modules`, which the running containers mount, and that
> leaves them without dependencies. If you install while the stack is up, run
> `make down && make up` afterwards.

Start the development environment:

```bash
make dev
```

This command will:

- build Docker images;
- start PostgreSQL;
- start the backend;
- start the frontend.

For the first project setup (or after resetting the database), initialize the database:

```bash
make setup
```

This command runs all database migrations and seeds one test company with users,
projects, activities, teams, planning and time logs.

`make seed` creates the **WorkTrack Demo** company with five test users — an
owner, a manager and three employees. The logins are written to
`apps/backend/docs/TEST-CREDENTIALS.md` (ignored by Git) every time you seed.
To change what gets created, edit `apps/backend/src/seed/seed-config.ts` and
re-run `make seed`.

## Available Commands

```bash
make up         # Start development containers
make down       # Stop containers
make down-hard  # Stop containers and remove database volumes
make migrate    # Run database migrations
make seed       # Seed the test company and write TEST-CREDENTIALS.md
make init       # Run migrations and seed data
make test       # Run backend tests (needs the stack running)
make setup      # First-time project setup (up + init)
make dev        # Start development environment
```

The same checks CI runs are available from the repository root. Each fans out
across both applications, skipping any that does not define the script — only
the backend has tests today:

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

## Environment Variables

Each application manages its own environment configuration. Copy each sample
and fill it in:

```bash
cp .env.sample .env                          # Postgres credentials for Docker
cp apps/backend/.env.sample apps/backend/.env
cp apps/frontend/.env.sample apps/frontend/.env
```

The samples list every variable, marked required or optional, and are the
contract for what a deployment needs. The backend validates them at startup and
refuses to boot if a required one is missing.

Two things worth knowing:

- The root `.env` sets the Postgres container's credentials. They must match
  `DB_USERNAME`, `DB_PASSWORD` and `DB_NAME` in `apps/backend/.env`.
- Hosted databases hand out a single connection URL instead of separate values.
  Set `DATABASE_URL` (and `DATABASE_SSL=true`) and the discrete `DB_*` variables
  are ignored.

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
| [`docs/architecture.md`](docs/architecture.md)                                     | System overview and documentation map — start here     |
| [`docs/business_architecture_docs.md`](docs/business_architecture_docs.md)         | Product definition, business rules, decisions, roadmap |
| [`docs/permission-model.md`](docs/permission-model.md)                             | The permission model and the scopes that delivered it  |
| [`docs/workflow.md`](docs/workflow.md)                                             | Branching, pull requests, CI, database changes         |

A local checkout also carries working documents that are deliberately kept out
of version control and so are not listed above: the active scope, the defects
and debt no scope owns, context notes for the backend and the frontend, and the
repository's coding conventions.

The backend serves Swagger at <http://localhost:3001/api/docs> when running.
It is off in production unless `ENABLE_SWAGGER=true` is set.

## Current Status

Under active development. The employee timesheet, the owner/manager team time
view, absences, capacity and expected hours, planning, reporting and admin CRUD
for users, teams, projects, activities and categories are implemented. Test
coverage is fifteen backend suites and 299 tests, covering who may see and
change whose data and the business rules behind each feature.

Reporting was the most recent piece of work: months lock by themselves a week
after they end, and owners and managers read hours, planned vs actual and
utilisation at `/reports`. The next work is hardening, with the hours export
built last.

The backend has a production Docker image (`apps/backend/Dockerfile`) and
migrations run as a deployment step. Pull requests are checked by GitHub Actions
and by a Vercel preview build, and `main` is protected. A shared development
stand is deployed — Vercel for the frontend, Render for the backend, Neon for the
database; see [`docs/workflow.md`](docs/workflow.md). There is no production
environment yet.
