up:
	docker-compose -f docker-compose.dev.yml up --build -d

down:
	docker-compose -f docker-compose.dev.yml down -v

migrate:
	docker-compose -f docker-compose.dev.yml exec backend npm run migration:run

seed:
	docker-compose -f docker-compose.dev.yml exec backend npm run seed:admin

init: migrate seed

dev: up init

