# Développement

## Prérequis

- Python 3.12 + `uv` (backend)
- Node 20+ + npm (frontend et worker)
- PostgreSQL 16 + Redis 7 (pour le backend, via Docker ou en local)
- Docker + Docker Compose (déploiement)

## Backend

```bash
cd backend
uv sync --extra dev              # installe les dépendances (uv.lock)
uv run alembic upgrade head      # applique les migrations
uv run uvicorn app.main:app --reload --port 8000
```

En environnement `development`, l'application crée les tables (si absentes) et
seed le catalogue des filières + la compagnie + les organisateurs bootstrap
(`ORGANIZER_INITIAL_EMAILS`).

### Tests

```bash
cd backend
uv run pytest                    # 27 tests (nécessite un PostgreSQL de test)
uv run ruff check .              # lint
```

Les tests utilisent une base `fame_test` dédiée (voir `tests/conftest.py`) et
exécutent les tests de concurrence contre un PostgreSQL réel (pas SQLite).

### Créer un organisateur

```bash
cd backend && uv run python ../scripts/create_organizer.py --username admin --email you@example.com
```

Ou via `ORGANIZER_INITIAL_EMAILS` (mot de passe temporaire imprimé dans les logs).

## Frontend

```bash
cd fame-react
npm install
npm run dev                      # Vite, proxy /api → :8000
npm run typecheck                # tsc --noEmit
npm run build                    # build de production + PWA
```

Routage par hash : `#/login`, `#/student`, `#/organizer`, `#/public`.

## Worker SchoolApp

```bash
npx wrangler dev                  # développement local
npx wrangler deploy               # déploiement
npx wrangler secret put SCHOOLAPP_PRIVATE_KEY
```

Le worker utilise la bibliothèque [`schoolapp.js`](https://github.com/NacreousDawn596/schoolapp.js)
vendue dans `vendor/schoolapp/`.

## Tout lancer avec Docker

```bash
cp .env.example .env
docker compose up -d --build
```

Services : `postgres`, `redis`, `api`, `worker`, `frontend`, `nginx` (port unique `5483`).

## Environnement reproductible

```bash
nix develop                      # shell de développement (uv + node + docker)
```

`flake.nix` épingle nixpkgs ; `backend/uv.lock` et `fame-react/package-lock.json`
épinglent les dépendances.
