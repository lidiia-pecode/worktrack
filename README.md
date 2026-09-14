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

## Environment Variables

Each application manages its own environment configuration:

```text
apps/backend/.env
apps/frontend/.env
```

Database credentials for Docker are configured through the root environment variables used by Docker Compose.

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

## Current Status

Under active development. The employee timesheet and admin CRUD for users,
teams, projects, activities and categories are implemented. Manager/owner
reporting views, CI/CD and production Docker configuration are not. Test
coverage has started with the role-visibility filters.
