# Déploiement

## Variables d'environnement requises

Toutes les valeurs sont fournies via `.env` (jamais commité). Copier `.env.example` et renseigner.

| Variable | Où | Description |
|----------|----|-------------|
| `POSTGRES_DB/USER/PASSWORD` | Compose | Base de données (réseau interne uniquement). |
| `REDIS_PASSWORD` | Compose | Redis (interne uniquement). |
| `FAME_WORKER_PUBLIC_KEY` | API | Clé publique Ed25519 du Worker (base64url). |
| `FAME_WORKER_ISSUER` | API | URL du Worker émetteur d'assertions. |
| `FAME_WORKER_AUDIENCE` | API | Audience attendue (`fame-api`). |
| `FAME_ACADEMIC_DOMAINS` | API | Domaines email académiques autorisés (ex. `ensam-umi.ac.ma`). |
| `FAME_VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT` | API | Clés Web Push (VAPID). |
| `FAME_ADMIN_USERNAME/PASSWORD/DISPLAY_NAME` | API | Compte bootstrap (créé au 1er démarrage). |
| `FAME_CORS_ORIGINS` | API | Origines autorisées (CORS). |
| `VITE_WORKER_URL` | Build web | URL du Worker (build-time, non secret). |
| `WEB_PORT` | Compose | Port d'exposition du proxy web (défaut 8080). |

## Docker Compose (self-hosted)

```bash
cp .env.example .env
# éditer .env
docker compose up -d --build
docker compose ps            # vérifier les healthchecks
```

PostgreSQL et Redis restent sur le réseau interne (`internal`) — aucun port exposé publiquement. Seul le proxy web est exposé.

## Backups / restauration

```bash
infra/scripts/backup.sh  /chemin/fame-$(date +%F).sql.gz
infra/scripts/restore.sh /chemin/fame-2026-01-01.sql.gz
```

Voir [`backup-restore.md`](backup-restore.md).

## HTTPS de production

Le reverse proxy Nginx fourni sert HTTP ; en production, terminer TLS en amont (Cloudflare / load balancer / `certbot`) et transmettre `X-Forwarded-Proto`. Activer alors `FAME_COOKIE_SECURE=true` et `FAME_CORS_ORIGINS=https://<domaine>`.

## Cloudflare Worker

```bash
cd workers/schoolapp-auth
npm install
npx wrangler secret put SIGNING_PRIVATE_KEY   # base64url Ed25519 (32 octets)
npx wrangler deploy
# puis récupérer la clé publique :
curl https://<worker>.workers.dev/public-key
```

Configurer ensuite `FAME_WORKER_PUBLIC_KEY` et `FAME_WORKER_ISSUER` côté API.

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
