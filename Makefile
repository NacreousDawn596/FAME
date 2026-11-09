.PHONY: help dev up down logs seed migrate test test-backend test-frontend keys organizer

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

up: ## Build and start the full stack (docker compose)
	docker compose up -d --build

down: ## Stop the stack
	docker compose down

logs: ## Tail all service logs
	docker compose logs -f

backend: ## Run the FastAPI backend locally (uv)
	cd backend && uv run uvicorn app.main:app --reload --port 8000

frontend: ## Run the Vite dev server
	cd frontend && npm run dev

worker: ## Run the notification worker locally (ARQ)
	cd backend && uv run arq app.workers.notifications.WorkerSettings

seed: ## Seed the filiere catalog + bootstrap organizers
	cd backend && uv run python -m app.seed.seed

migrate: ## Apply database migrations
	cd backend && uv run alembic upgrade head

keys: ## Generate SchoolApp + VAPID keypairs and print env snippets
	cd backend && uv run python ../scripts/generate_keys.py

organizer: ## Create an organizer account (interactive)
	cd backend && uv run python ../scripts/create_organizer.py

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend test suite
	cd backend && uv run pytest

test-frontend: ## Run frontend test suite
	cd frontend && npm test
