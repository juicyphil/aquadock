.PHONY: build up down restart logs clean backend frontend backend-dev frontend-dev db-shell test

# Docker
build:
	docker compose build

up: build
	docker compose up -d

rebuild: build up

down:
	docker compose down

restart: down up

logs:
	docker compose logs -f

clean:
	docker compose down -v
	docker rmi aquadock:latest 2>/dev/null || true

# Development (no Docker)
backend-dev:
	cd backend && go run ./cmd/server/

frontend-dev:
	cd frontend && npm run dev

# Utility
db-shell:
	cd backend && sqlite3 data/aquadock.db

test:
	cd backend && go vet ./...
	cd frontend && npx tsc --noEmit
