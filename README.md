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
- start the frontend;
- run database migrations;
- seed the default administrator account.

## Available Commands

```bash
make up          # Start development containers
make down        # Stop and remove containers
make migrate     # Run database migrations
make seed        # Seed the administrator account
make init        # Run migrations and seed data
make dev         # Full development setup
```

## Environment Variables

Each application manages its own environment configuration:

```text
apps/backend/.env
apps/frontend/.env
```

Database credentials for Docker are configured through the root environment variables used by Docker Compose.

## Current Status

The project is currently under active development. Additional features, production Docker configuration, CI/CD, testing, and deployment guides will be added as the project evolves.
