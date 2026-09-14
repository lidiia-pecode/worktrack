up:
	docker-compose -f docker-compose.dev.yml up --build -d

# Stop containers, keep database
down:
	docker-compose -f docker-compose.dev.yml down

# Stop containers and remove volumes (reset database)
down-hard:
	docker-compose -f docker-compose.dev.yml down -v

migrate:
	docker-compose -f docker-compose.dev.yml exec backend npm run migration:run

# Backend tests. They hit the dev database, so the stack must be running.
test:
	docker-compose -f docker-compose.dev.yml exec backend npm test

seed:
	docker-compose -f docker-compose.dev.yml exec backend npm run seed:admin

init: migrate seed

# First project setup / reset database
setup: up init

# Start project with existing data
dev: up

