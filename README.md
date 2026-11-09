# FAME

**Recruitment Queue & Attribution Platform** for ENSAM Meknès.

One company, one or more organizers, many candidates, one FIFO queue per filière,
fully reversible attribution, and a deliberately minimal candidate experience.

Candidates sign in with their SchoolApp account, install the PWA, enable
notifications, and watch their queue position update live. Organizers attribute
the next candidate in a filière with one click, undo any action, and inspect a
complete audit trail.

## Features

- **SchoolApp auth** via a Cloudflare Worker that signs short-lived Ed25519
  identity assertions (verified independently by the backend).
- **Filière catalog** (37 records) seeded by migration.
- **FIFO queues per filière** with atomic, concurrency-safe attribution.
- **Reversible attribution** — undo, return, cancel, restore, and "undo last".
- **Immutable audit log** of every operation.
- **Web Push notifications** with VAPID, deduplication, retries, and subscription
  invalidation.
- **WebSocket live sync** (filière-scoped for candidates, board-wide for organizers).
- **React PWA** (installable) + **organizer dashboard**.
- **Reproducible builds** via Nix + `uv.lock` + `package-lock.json`.

## Stack

React · TypeScript · Vite · Tailwind CSS · shadcn/ui · FastAPI · SQLAlchemy 2 ·
Alembic · PostgreSQL · Redis · ARQ · Web Push (VAPID) · Docker Compose · Nix.

## Quick start

```bash
cp .env.example .env        # fill in secrets
cd backend && uv run python ../scripts/generate_keys.py
docker compose up -d --build
```

See [`docs/deployment.md`](docs/deployment.md) for the full guide.

## Development

```bash
# Backend (needs a Postgres + Redis; see .env)
cd backend && uv sync --extra dev && uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

Run tests:

```bash
make test-backend     # pytest (PostgreSQL concurrency tests)
make test-frontend    # vitest

# End-to-end (requires a running stack + organizer credentials):
cd frontend && npm install && npx playwright install chromium
FAME_ORGANIZER_PASSWORD=... npm run test:e2e
```

## Layout

```
backend/    FastAPI app, Alembic migrations, tests
frontend/   React PWA + organizer dashboard
schoolapp.js Cloudflare Worker (SchoolApp auth)
infra/      Dockerfiles + nginx
scripts/    key generation + organizer CLI
docs/       architecture, auth, queue, notifications, deployment
```

## Documentation

- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [Queue](docs/queue.md)
- [Notifications](docs/notifications.md)
- [Deployment](docs/deployment.md)
