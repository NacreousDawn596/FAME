# Deployment

FAME runs on any Linux host with Docker. Nix is used for reproducible tooling
and images; the host does **not** need NixOS.

## 1. Configure environment

```bash
cp .env.example .env
```

Fill in every value. The important ones:

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL`, `POSTGRES_*` | PostgreSQL connection. |
| `REDIS_URL` | Redis connection. |
| `SCHOOLAPP_PUBLIC_KEY` | Ed25519 public key (see below). |
| `SESSION_SECRET` | Random 32+ byte secret. |
| `ORGANIZER_INITIAL_EMAILS` | Comma-separated organizer emails. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push. |
| `ALLOWED_ORIGINS` | Frontend origin(s). |

## 2. Generate keys

```bash
cd backend && uv run python ../scripts/generate_keys.py
```

- Put the `SCHOOLAPP_PRIVATE_KEY` output in the Cloudflare Worker as a secret.
- Put `SCHOOLAPP_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` into `.env`.

## 3. Deploy the SchoolApp Worker

See `wrangler.toml` and `docs/authentication.md`. Deploy with:

```bash
wrangler secret put SCHOOLAPP_PRIVATE_KEY
wrangler deploy
```

## 4. Start the stack

```bash
docker compose up -d --build
```

Services: `postgres`, `redis`, `api`, `worker`, `frontend`, `nginx`.

Everything is exposed through a **single port** (`PORT`, default **5483**):

- App (candidate PWA + organizer dashboard): http://localhost:5483
- API (routed by nginx): http://localhost:5483/api/v1

The `api` and `frontend` services bind only to the internal Docker network and
are not published to the host. OpenAPI docs are served by the backend in dev
(`uvicorn` on :8000 at `/docs`).

## 5. Database initialization

Migrations run automatically via `alembic` (invoke manually with `make migrate`
or run in the container: `docker compose exec api alembic upgrade head`).

The filière catalog and the default company are seeded by the initial migration
and by the startup seed. Organizers listed in `ORGANIZER_INITIAL_EMAILS` are
created on first boot with a temporary password printed to the `api` logs.

## 6. Create an organizer (interactive)

```bash
cd backend && uv run python ../scripts/create_organizer.py --username admin --email you@example.com
```

## 7. PWA installation

Open the frontend over **HTTPS** (Web Push requires a secure context), sign in,
then use the browser's "Install app" prompt. "Enable notifications" registers the
push subscription.

## Reproducibility

- `flake.nix` / `flake.lock` pin the toolchain (`nix develop`).
- `backend/uv.lock` pins every Python dependency.
- `fame-react/package-lock.json` pins every Node dependency.
- `nix build .#frontend` builds the frontend reproducibly.
- Docker images install from the lockfiles at build time — no runtime downloads.
