# Preuve de vérification (exécution réelle)

Toutes les commandes ci-dessous ont été exécutées contre l'environnement local (Docker Compose + Testcontainers) avec des identités synthétiques.

## Suites de tests

| Suite | Tests | Échecs | Erreurs | Environnement |
|-------|-------|--------|---------|---------------|
| `QueueEngineIntegrationTest` | 6 | 0 | 0 | Testcontainers (Postgres 16 + Redis 7) |
| `SchoolAppAssertionVerifierTest` | 5 | 0 | 0 | JUnit (clé Ed25519 générée) |
| `QueueStateMachineTest` | 3 | 0 | 0 | JUnit |
| `AnalyticsServiceTest` | 2 | 0 | 0 | JUnit (Mockito) |
| **Backend total** | **16** | **0** | **0** | — |
| Worker (`worker.test.js`) | 6 | 0 | 0 | Vitest (upstream mocké) |
| Web (`StatusBadge`, `i18n`) | 5 | 0 | 0 | Vitest + Testing Library |

## Stack Docker (smoke test)

`docker compose up -d --build` → 4 conteneurs sains :

```
fame-postgres-1   Up (healthy)
fame-redis-1      Up (healthy)
fame-api-1        Up (healthy)
fame-web-1        Up  (0.0.0.0:8080->80)
```

- `GET /actuator/health` → `{"status":"UP"}` (liveness + readiness).
- `GET /api/v1/openapi` → 200.
- `GET /` (frontend) → 200.

## Flux vérifiés bout-en-bout (curl + assertion Ed25519 réelle)

1. **Login staff** → `{"role":"ADMIN",...}` (session Redis, `Serializable`).
2. **Création entreprise + campagne** → OK.
3. **Activation campagne** (`DRAFT`→`ACTIVE`) → OK.
4. **Import roster CSV** → `{"imported":1,"errors":0}`.
5. **Challenge étudiant** → `{challenge, nonce}`.
6. **Assertion signée** (Ed25519, sub=CNE12345) → `status":"WAITING","sequenceNo":1`.
7. **Étudiant non éligible** (hors roster) → `{"code":"NOT_ELIGIBLE"}` (403).
8. **Rejeu d'assertion** → `{"code":"ASSERTION_REPLAY"}` (rejeté).
9. **Création recruteur + station** → OK.
10. **Appel FIFO** → `{"called":true, "status":"CALLED"}` + station `OCCUPIED`.
11. **Compteurs** → `CALLED=1, WAITING=0`.
12. **Vue étudiante** (`/auth/me`) → `status":"CALLED"`.

## Scans de dépendances (réels)

| Cible | Production | Dev-only | Remédiation |
|-------|-----------|----------|-------------|
| `apps/web` (`npm audit --omit=dev`) | **0** | 8 | react-router 7.18.4 (fixé) |
| `workers/schoolapp-auth` (`npm audit --omit=dev`) | **0** | 12 | cheerio 1.0.0 (fixé) |
| Backend (OWASP Dependency-Check) | — | — | bloqué par clé NVD API (configuré en CI) |

## Non exécuté (documenté, pas inventé)

- DAST (ZAP), Trivy (image), test de charge 500 étudiants, revue SchoolApp réel, conformité légale.
