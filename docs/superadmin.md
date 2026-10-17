# Centre de contrôle superadmin

## Identité superadmin

Le superadmin est identifié par son **email institutionnel vérifié** (via le flux SchoolApp), comparé côté serveur à la configuration `fame.admin.email` (`config.yml`). Ce n'est **pas** un mot de passe — l'authentification exige toujours l'assertion SchoolApp signée.

- **Normalisation** : `email.trim().toLowerCase()` des deux côtés.
- **Autorité** : la configuration serveur (`config.yml`) est la source de vérité. Le frontend ne fournit jamais d'email ou de rôle pour s'auto-promouvoir.
- **Backing account** : un `AppUser` (rôle `SUPERADMIN`) est créé/trouvé avec un mot de passe local aléatoire inutilisable (login local impossible par mot de passe).
- **Rôle** : `ROLE_SUPERADMIN`, distinct des rôles `ADMIN`/`ORGANIZER` (« administrateurs ordinaires »).

## Connexion

1. `GET /api/v1/auth/csrf` puis `POST /api/v1/auth/student/challenge`.
2. Envoyer les identifiants SchoolApp au Worker → assertion signée.
3. `POST /api/v1/auth/admin/login { assertion }` → session `ROLE_SUPERADMIN`.

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
