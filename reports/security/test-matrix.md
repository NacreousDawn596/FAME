# Matrice menace → test

Références : OWASP ASVS 5.0.0, OWASP Top 10:2025, OWASP API Security Top 10:2023.

| # | Classe de menace | Réf. OWASP | Test(s) | Outil | Statut |
|---|------------------|------------|---------|-------|--------|
| A1 | Assertion invalide / altérée | API8, ASVS 4.1 | `SchoolAppAssertionVerifierTest` (signature, issuer, audience, expiration, nonce, rejeu) | JUnit | ✅ |
| A2 | Rejeu de challenge | ASVS 4.2 | `rejectsConsumedChallenge` | JUnit | ✅ |
| A3 | Login étudiant (échec/succès) | API2 | `worker.test.js` (401/200, champs manquants, payload surdimensionné) | Vitest | ✅ |
| A4 | Brute-force / énumération | API4, ASVS 2.9 | `RateLimiter` (Redis) + messages génériques | Code | 🟡 (limiteur unitaire non testé) |
| A5 | Session fixation | ASVS 3.2 | `request.changeSessionId()` + cookie HttpOnly/Secure/SameSite | Code | 🟡 |
| A6 | CSRF | ASVS 4.2 | Cookie `XSRF-TOKEN` + `X-XSRF-TOKEN` sur tous POST | Code | ✅ (conception) |
| A7 | IDOR/BOLA inter-campagnes | API1 | `crossCampaignAccessIsRejected` | Testcontainers | ✅ |
| A8 | Mass assignment | API6 | DTO stricts, pas de sérialisation d'entités | Code | ✅ |
| A9 | Double affectation (race) | API5 | `concurrentClaimsNeverDoubleAssign` (4 threads) | Testcontainers | ✅ |
| A10 | Transitions d'état invalides | — | `QueueStateMachineTest` | JUnit | ✅ |
| A11 | FIFO déterministe | — | `preservesFifoTieBreakOrdering` | Testcontainers | ✅ |
| A12 | Éligibilité (domaine + liste blanche) | API1 | `AuthService` (domaine, roster, campagne active) | Code | 🟡 (pas de test d'intégration dédié) |
| A13 | Injection SQL | A03:2025 | JPA paramétré + requêtes natives à paramètres | Code | ✅ |
| A14 | XSS / injection HTML | A03:2025 | React (échappement par défaut) + CSP + `frame-ancestors none` | Code | 🟡 |
| A15 | Injection CSV (export) | A03:2025 | `ExportService.csvCell` neutralise `= + - @` | Code | ✅ |
| A16 | SSRF (Worker) | API7 | Épinglage d'origine + allowlist + `Redirect outside allowed origin` | Code + tests | ✅ |
| A17 | Fuite de données publiques | API3 | `PublicDisplayController` (prénom/code uniquement) | Code | 🟡 |
| A18 | Dépendances (npm) | A06:2025 | `npm audit` (web: 0 prod ; worker: 0 prod) | npm audit | ✅ (dev-only restants) |
| A19 | Dépendances (Java) | A06:2025 | OWASP Dependency-Check | Gradle | 🟡 (en cours) |
| A20 | Secrets dans le dépôt | A06:2025 | `gitleaks` (CI) | gitleaks | 🟡 (CI uniquement) |
| A21 | Image conteneur | A06:2025 | Dockerfiles non-root, read-only, cap_drop ALL | Code | ✅ (trivy non exécuté) |
| A22 | DAST applicatif | — | OWASP ZAP (authentifié) | ZAP | ⬜ (outil non dispo) |
| A23 | Charge 500 étudiants/min | — | playbook k6 | k6 | ⬜ (non exécuté) |

Légende : ✅ vérifié · 🟡 partiellement vérifié / revue de conception · ⬜ non exécuté (outil non disponible dans l'environnement).
