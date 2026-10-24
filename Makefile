COMPOSE = docker-compose -f docker-compose.dev.yml

# Postgres runs in Docker; the backend and frontend run on this machine.
db:
	$(COMPOSE) up -d --wait db

# Start Postgres, then the backend and frontend in this terminal.
# Ctrl+C stops both apps; Postgres keeps running until `make down`.
dev: db
	npm run dev

# Stop Postgres, keep its data
down:
	$(COMPOSE) down

# Stop Postgres and delete its data (reset database)
down-hard:
	$(COMPOSE) down -v

migrate: db
	npm run migration:run -w apps/backend

# Pending migrations against the hosted database (Neon): a dry run that names the
# target and classes each migration; APPLY=1 runs them after a typed confirmation,
# ALLOW_DESTRUCTIVE=1 is needed for a DROP, RENAME, NOT NULL or type change,
# ONLY=<name> applies one of several. See docs/workflow.md.
migrate-neon:
	npm run -s migrate:neon -w apps/backend -- $(if $(APPLY),--apply) $(if $(ALLOW_DESTRUCTIVE),--allow-destructive) $(if $(ONLY),--only=$(ONLY))

# Backend tests. They hit the dev database, so Postgres must be running.
test: db
	npm test -w apps/backend

seed: db
	npm run seed -w apps/backend

init: migrate seed

# First project setup / reset database
setup: init

.PHONY: db dev down down-hard migrate migrate-neon test seed init setup
