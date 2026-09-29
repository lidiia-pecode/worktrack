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

# Backend tests. They hit the dev database, so Postgres must be running.
test: db
	npm test -w apps/backend

seed: db
	npm run seed -w apps/backend

init: migrate seed

# First project setup / reset database
setup: init

.PHONY: db dev down down-hard migrate test seed init setup
