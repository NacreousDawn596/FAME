# Développement & tests

## Prérequis

- JDK 17+, Node 20+, Docker (avec démon actif), Gradle 8.14 (via wrapper).

## Backend (`services/api`)

```bash
./gradlew compileJava          # compilation
./gradlew test                 # unités + intégration (Testcontainers)
./gradlew bootRun              # lancement local (nécessite Postgres + Redis)
```

Variables d'env de test (Testcontainers auto-configurées). Pour exécuter l'intégration avec un démon Docker nécessitant `DOCKER_HOST`/API version :

```bash
DOCKER_HOST=unix:///var/run/docker.sock TESTCONTAINERS_RYUK_DISABLED=true ./gradlew test
```

## Frontend (`apps/web`)

```bash
npm install
npm run dev        # Vite (proxy /api -> :8080)
npm test           # Vitest + Testing Library
npm run lint       # tsc --noEmit (typecheck)
npm run build      # build de production + PWA
```

## Worker (`workers/schoolapp-auth`)

```bash
npm install
npm test            # Vitest (upstream mocké)
npx wrangler dev    # développement local
npx wrangler deploy # déploiement (voir docs/deployment.md)
```

## Tests E2E (Playwright)

Playbook fourni dans `tests/e2e/`. Les scénarios (création de campagne, import roster, login étudiant mocké, appel/dispatch, isolation) sont documentés ; leur exécution automatisée nécessite un serveur de mocks SchoolApp et une instance de test dédiée.

## Charge (k6)

Voir `tests/load/k6-registration.js`.
