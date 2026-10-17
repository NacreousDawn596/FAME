# Constatations de sécurité

Tous les tests ont été exécutés contre l'environnement local (Testcontainers, mocks) avec des identités synthétiques. Aucun test contre le service SchoolApp institutionnel ou des tiers.

## Résumé

| Sévérité | Confirmé | Corrigé | En attente | Non confirmé |
|----------|----------|---------|------------|--------------|
| Critique | 2 (dev-only) | 0 | 0 | 0 |
| Élevée | 1 (production) | 1 | 0 | 0 |
| Moyenne | 5 (dev-only) | 0 | 0 | 0 |

Aucune vulnérabilité **production** critique/élevée non résolue.

---

## FINDING-001 — CSRF token & dumps de contenu journalisés (schoolapp.js)

- **Composant** : `schoolapp.js` (`src/auth.js`).
- **Sévérité** : Moyenne. **Catégorie** : CWE-532 (journalisation d'info sensible).
- **Scénario** : `updateCsrfToken` journalisait le jeton CSRF (tronqué) et un dump de la page de login (2000 caractères), pouvant inclure des marqueurs de session.
- **Preuve** : lignes 75 et 195–198 de `auth.js` (commit `d89de2a`).
- **Cause racine** : journalisation de débogage non nettoyée.
- **Correctif** : suppression des logs (voir `workers/schoolapp-auth/vendor/src/auth.js`).
- **Retest** : build + tests Worker passent. **Statut** : ✅ corrigé.

## FINDING-002 — Mix CJS/ESM dans schoolapp.js (compatibilité)

- **Composant** : `schoolapp.js` (`auth.js`, `managers/index.js`).
- **Sévérité** : Moyenne. **Catégorie** : CWE-1104 (dépendance de compatibilité).
- **Scénario** : `auth.js` utilisait `import`/`export` (ESM) chargé via `require` (CJS), ne fonctionnant que sur Node ≥ 22 (`require(esm)`), contrairement au `engines: >=18` déclaré.
- **Correctif** : conversion en CJS des fichiers concernés.
- **Retest** : `require('./index.js')` OK + tests Worker passent. **Statut** : ✅ corrigé.

## FINDING-003 — Suivi de redirection ouvert dans le client HTTP

- **Composant** : `schoolapp.js` (`http_client.js`).
- **Sévérité** : Élevée (dans le contexte Worker = SSRF potentiel). **Catégorie** : CWE-601.
- **Scénario** : le client suivait `location` sans vérifier l'origine, autorisant une redirection hors de l'origine allowlistée.
- **Correctif** : épinglage de l'origine de redirection (`Redirect outside allowed origin blocked`).
- **Retest** : tests Worker. **Statut** : ✅ corrigé.

## FINDING-004 — @remix-run/router / react-router XSS & open redirect

- **Composant** : `apps/web` (`react-router-dom`).
- **Sévérité** : Élevée. **Réf** : GHSA-2w69-qvjg-hvjx, GHSA-2j2x-hqr9-3h42.
- **Scénario** : XSS via open redirect et redirection `//` sur des chemins contrôlés par l'utilisateur.
- **Correctif** : montée à `react-router-dom@7.18.4` (résout `@remix-run/router` et `turbo-stream`).
- **Retest** : `npm audit --omit=dev` → 0 vulnérabilité ; build + tests OK. **Statut** : ✅ corrigé.

## FINDING-005 — Dépendances vulnérables (cheerio-without-node-native)

- **Composant** : `workers/schoolapp-auth` (dépendance runtime de parsing HTML).
- **Sévérité** : Critique. **Réf** : `form-data` (CWE-...), `nth-check` (CVE-2021-3803).
- **Scénario** : paquet non maintenu (2016) tirant des dépendances transitives vulnérables.
- **Correctif** : remplacement par `cheerio@1.0.0` (maintenu) dans le code vendé.
- **Retest** : `npm audit --omit=dev` → 0 vulnérabilité ; tests Worker + dry-run OK. **Statut** : ✅ corrigé.

## FINDING-006 — Vulnérabilités dev-only (vitest/vite/esbuild/tinypool)

- **Composant** : `apps/web` + `workers/schoolapp-auth` (dépendances de développement/test).
- **Sévérité** : Critique (tinypool) + Moyennes (esbuild, @vitest/mocker). **Non expédiées** en production (exclues du bundle).
- **Scénario** : RCE via prototype pollution (tinypool) dans le runner de tests ; SSRF du serveur de dev (esbuild).
- **Remédiation** : monter `vitest` vers 3.x et `vite` vers 6.x (breaking). Non prioritaire (dev-only).
- **Statut** : 🟡 en attente (risque résiduel dev-only, hors production).

---

## Non effectué / limites (honnête)

- **OWASP Dependency-Check (backend)** : plugin configuré (`build.gradle`), mais l'exécution échoue sans clé NVD API (NIST renvoie 403/404). Le CI fournit `NVD_API_KEY`. Les dépendances Java sont épinglées et revues manuellement en attendant.
- **DAST (ZAP)** et **Trivy** : outils absents de l'environnement ; prévus en CI.
- **Charge 500 étudiants** : playbook k6 fourni, exécution non réalisée faute d'environnement de charge.
- **Revue manuelle SchoolApp réel** : nécessite des comptes de test autorisés.
- **Conformité légale CNDP/RGPD** : revue juridique dédiée requise.
