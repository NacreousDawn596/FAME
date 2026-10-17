# Déploiement

## Configuration

Le backend est configuré **uniquement** via `config.yml` (voir `config.yml.example`). Le frontend via `apps/web/.env` (voir `apps/web/.env.example`).

### Variables d'environnement requises

| Variable | Où | Description |
|----------|----|-------------|
| `POSTGRES_DB/USER/PASSWORD` | `.env` (Compose) | Base de données (réseau interne uniquement). |
| `REDIS_PASSWORD` | `.env` (Compose) | Redis (interne uniquement). |
| `VITE_WORKER_URL` | `apps/web/.env` | URL du Worker (build-time, non secret). |

### Clés de configuration backend (`config.yml`)

| Clé | Description |
|-----|-------------|
| `fame.worker.public-key` | Clé publique Ed25519 du Worker (base64url). |
| `fame.worker.issuer/audience` | URL du Worker émetteur + audience (`fame-api`). |
| `fame.academic.domains` | Domaines email académiques autorisés. |
| `fame.vapid.public-key/private-key/subject` | Clés Web Push (VAPID). |
| `fame.bootstrap.admin-*` | Compte bootstrap (créé au 1er démarrage). |
| `fame.cors.origins` | Origines autorisées (CORS). |
| `spring.datasource.*` / `spring.data.redis.*` | Connexions (en Docker, hôte = `postgres`/`redis`). |

## Docker Compose (self-hosted)

```bash
cp .env.example .env
cp config.yml.example config.yml
# éditer .env (infra) et config.yml (application)
docker compose up -d --build
docker compose ps            # vérifier les healthchecks
```

PostgreSQL et Redis restent sur le réseau interne (`internal`) — aucun port exposé publiquement. Seul le proxy web est exposé. `config.yml` est monté en lecture seule dans `/app/config.yml`.

## Backups / restauration

```bash
infra/scripts/backup.sh  /chemin/fame-$(date +%F).sql.gz
infra/scripts/restore.sh /chemin/fame-2026-01-01.sql.gz
```

Voir [`backup-restore.md`](backup-restore.md).

## HTTPS de production

Le reverse proxy Nginx fourni sert HTTP ; en production, terminer TLS en amont (Cloudflare / load balancer / `certbot`) et transmettre `X-Forwarded-Proto`. Activer alors `server.servlet.session.cookie.secure: true` et `fame.cors.origins=https://<domaine>` dans `config.yml`.

## Cloudflare Worker

```bash
cd workers/schoolapp-auth
npm install
npx wrangler secret put SIGNING_PRIVATE_KEY   # base64url Ed25519 (32 octets)
npx wrangler deploy
# puis récupérer la clé publique :
curl https://<worker>.workers.dev/public-key
```

Configurer ensuite `fame.worker.public-key` et `fame.worker.issuer` dans `config.yml`.

Génération de la paire de clés Ed25519 :

```bash
openssl genpkey -algorithm ed25519 -out key.pem
openssl pkey -in key.pem -pubout -out pub.pem
# encoder en base64url les 32 octets (seed privée et clé publique)
```

Le Worker est un composant déployé séparément (Cloudflare Workers, géré par Cloudflare) et n'est **pas** un conteneur du `docker-compose.yml`.

## Rollback

1. `docker compose down` puis re-déployer l'image précédente (tag).
2. Si un schéma a changé, restaurer le backup correspondant (`restore.sh`).
3. Réexécuter les tests de migration avant toute montée de version.
