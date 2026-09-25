COMPOSE = docker-compose -f docker-compose.dev.yml

# Rebuild the images and start fresh app containers: node_modules and the
# Next.js cache come from the new images. Only the database is kept.
up:
	$(COMPOSE) build
	$(MAKE) remove-apps
	$(COMPOSE) up -d

# Stop containers, keep database
down: remove-apps
	$(COMPOSE) down

# Stop containers and remove volumes (reset database)
down-hard:
	$(COMPOSE) down -v

# Removes the app containers together with their anonymous volumes, so none are
# left behind.
remove-apps:
	$(COMPOSE) rm --stop --force --volumes backend frontend

migrate:
	$(COMPOSE) exec backend npm run migration:run

# Backend tests. They hit the dev database, so the stack must be running.
test:
	$(COMPOSE) exec backend npm test

seed:
	$(COMPOSE) exec backend npm run seed

init: migrate seed

# First project setup / reset database
setup: up init

# Start project with existing data
dev: up

.PHONY: up down down-hard remove-apps migrate test seed init setup dev
