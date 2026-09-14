# WorkTrack

WorkTrack is a full-stack time tracking application designed for teams and companies. It provides an intuitive way for employees to log working hours while giving managers visibility into projects, teams, and productivity.

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

## Documentation

| Document                                                                           | Covers                                                 |
| :--------------------------------------------------------------------------------- | :----------------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md)                                     | System overview and documentation map — start here     |
| [`docs/business_architecture_docs.md`](docs/business_architecture_docs.md)         | Product definition, business rules, decisions, roadmap |
| [`docs/current-scope.md`](docs/current-scope.md)                                   | The next implementation scope (EN + UA)                |
| [`apps/backend/docs/backend-context.md`](apps/backend/docs/backend-context.md)     | Domain modules, API surface, data model, roles         |
| [`apps/backend/docs/auth.md`](apps/backend/docs/auth.md)                           | Tokens, sessions, guards, Google OAuth                 |
| [`apps/frontend/docs/frontend-context.md`](apps/frontend/docs/frontend-context.md) | Routing, data layer, design tokens, components         |
| [`CLAUDE.md`](CLAUDE.md)                                                           | Coding conventions and workflow rules                  |

The backend serves Swagger at <http://localhost:3001/api/docs> when running.
It is off in production unless `ENABLE_SWAGGER=true` is set.

## Current Status

Under active development. The employee timesheet and admin CRUD for users,
teams, projects, activities and categories are implemented. Manager/owner
reporting views are not. Test coverage has started with the role-visibility
filters.

The backend has a production Docker image (`apps/backend/Dockerfile`) and
migrations can run as a deployment release step. Nothing is hosted yet, and
there is no CI pipeline.
