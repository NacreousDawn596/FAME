# FAME — Forum des Entreprises

FAME numérise l'organisation des événements de recrutement et des entretiens de fin d'études (PFE) au Maroc. Il remplace les fichiers d'inscription manuels, les files d'attente coordonnées à la main et la synchronisation informelle entre organisateurs.

## Fonctionnalités

- **Campagnes isolées** : chaque événement possède sa propre file d'attente, son QR code d'accès et ses données séparées (isolation logique multi-locataire).
- **Authentification étudiante** via le service institutionnel **SchoolApp** (ENSAM/UMI), sans Google SSO, au travers d'un **Cloudflare Worker** dédié qui émet des assertions signées (Ed25519) à usage unique.
- **File d'attente FIFO** autoritaire côté serveur, avec verrouillage transactionnel (`FOR UPDATE SKIP LOCKED`) contre les doubles affectations.
- **Tableau de bord régulateur** temps réel (SSE + Redis Pub/Sub) avec plan 2D de la salle, appel, dispatching, absences, pauses.
- **Expérience étudiant** mobile-first avec notifications Web Push (VAPID) et repli in-app.
- **Analyses et exports** (CSV/JSON) post-événement.

## Architecture

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 18 + TypeScript + Vite, PWA (manifest + service worker), TanStack Query |
| Backend | Java 17 + Spring Boot 3.3, Spring Security, Spring Data JPA, Flyway |
| Données | PostgreSQL 16, Redis 7 |
| Temps réel | SSE (server-sent events) + Redis Pub/Sub, repli polling |
| Auth étudiante | Cloudflare Worker (`workers/schoolapp-auth`) |
| Infra | Docker / Docker Compose, Nginx reverse proxy, GitHub Actions CI |

Voir [`docs/architecture.md`](docs/architecture.md) et [`docs/auth-trust-boundary.md`](docs/auth-trust-boundary.md).

## Démarrage rapide (Docker)

```bash
cp .env.example .env              # variables infra (Postgres/Redis)
cp config.yml.example config.yml  # configuration backend
# puis renseignez les secrets dans config.yml
docker compose up --build
```

- Frontend : http://localhost:8080
- API / Swagger : http://localhost:8080/api/v1/docs

Configuration : le backend est configuré via `config.yml` (voir `config.yml.example`) ; le frontend via `apps/web/.env` (voir `apps/web/.env.example`).

## Tests

```bash
# Backend (unités + intégration Testcontainers)
cd services/api && ./gradlew test

# Worker
cd workers/schoolapp-auth && npm test

# Frontend
cd apps/web && npm test && npm run build
```

## Structure du dépôt

```
apps/web/              Frontend React + PWA
services/api/          Backend Spring Boot (factory pattern dans services/api/src/main/java/ma/ensam/fame/factory)
workers/schoolapp-auth Cloudflare Worker (auth SchoolApp)
infra/                 Docker, proxy Nginx, scripts
tests/                 e2e / sécurité / charge (playbooks)
reports/               Rapports sécurité & performance
docs/                  Documentation
config.yml.example     Configuration backend (template)
```

## Sécurité

Le modèle de menace, la matrice de tests et les résultats sont dans [`reports/security/`](reports/security/README.md). Les données personnelles des étudiants (emails institutionnels, identités) sont traitées en tenant compte de la loi 09-08 et des recommandations CNDP.

Voir [`docs/secrets.md`](docs/secrets.md) pour la liste exhaustive des variables d'environnement et des secrets.
