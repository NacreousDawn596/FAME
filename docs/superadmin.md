# Centre de contrôle superadmin

## Identité superadmin

Le superadmin est un compte **email + mot de passe** (stocké en base), seedé au premier démarrage depuis `fame.admin.email` + `fame.admin.password` (`config.yml`).

- **Normalisation** : `email.trim().toLowerCase()`.
- **Autorité** : la configuration serveur (`config.yml`) est la source de vérité. Le frontend ne fournit jamais d'email ou de rôle pour s'auto-promouvoir.
- **Compte** : un `AppUser` (rôle `SUPERADMIN`) est créé si absent ; le mot de passe est hashé (BCrypt).
- **Rôle** : `ROLE_SUPERADMIN`, distinct de `ADMIN`/`ORGANIZER`/`RECRUITER`.

## Connexion

Une page de connexion unique (`/login`) pour tous les comptes : superadmin, admin, organizer, recruteur. L'email est utilisé comme identifiant, le mot de passe est vérifié contre la base (BCrypt) :

1. `GET /api/v1/auth/csrf`.
2. `POST /api/v1/auth/login { email, password }` → session selon le rôle.

Les étudiants, eux, passent toujours par le flux SchoolApp (QR code d'inscription), pas par cette page.

## Autorisation

| Chemin | Accès |
|--------|-------|
| `/api/admin/**` | `ROLE_SUPERADMIN` uniquement |
| `/api/v1/admin/**` (campagnes/entreprises) | `ADMIN` **ou** `SUPERADMIN` |
| `/admin` (frontend) | `ROLE_SUPERADMIN` (sinon page « Accès refusé ») |

Le superadmin a un accès global aux campagnes (isolation inter-campagnes non affaiblie pour les autres rôles).

## API administrateur

- `GET /api/admin/overview` — agrégats (campagnes, étudiants, postes, actions récentes, diffusions).
- `GET/PATCH /api/admin/users` — personnel (désactivation, rôle, révocation de sessions).
- `POST/GET /api/admin/recruiters` — création et liste des comptes recruteurs (email + mot de passe).
- `GET /api/admin/students` — recherche d'étudiants (pagination/filtres).
- `GET /api/admin/audit` + `/export` — journal append-only (aucun `DELETE`).
- `GET/POST/PUT/DELETE /api/admin/notifications/templates` + `/preview` + `/send` + liste des diffusions.
- `GET /api/admin/configuration` (vue sûre) + `GET/PUT /configuration/settings`.
- `GET /api/admin/health` — diagnostics réels (DB, Redis, VAPID, superadmin configuré).
- `GET /api/admin/data/counts`, `POST /data/archive-closed-campaigns`, exports.

## Garde-fous

- Les secrets, le contenu de `config.yml`, l'email superadmin et la clé privée VAPID ne sont **jamais** exposés (voir `ConfigurationFacade`).
- Le journal d'audit est append-only (pas de `DELETE`).
- Aucune console SQL ni exécution de commandes arbitraires.
- Les opérations sensibles (désactivation, révocation, rôle) génèrent un événement d'audit.

## Paramètres métier persistants

Les réglages mutables (ex. `queue.prealert.count`) sont stockés en base (`app_setting`), distincts de `config.yml` (versionné) et des secrets (bootstrap). Ils ne peuvent pas affaiblir l'autorisation superadmin.
