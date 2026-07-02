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


# --------------------
# PROD
# --------------------

prod-up:
	docker-compose -f docker-compose.prod.yml up --build -d

prod-down:
	docker-compose -f docker-compose.prod.yml down -v

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f
