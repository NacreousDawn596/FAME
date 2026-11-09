# Sécurité

## Authentification

- **Candidat** : assertion SchoolApp signée Ed25519 (vérification signature +
  `iss` + `aud` + `exp` + `sub`), puis session JWT (HS256) en cookie HTTP-only.
- **Organisateur** : Argon2id, session opaque (token haché) en cookie HTTP-only
  `SameSite=Strict`, expiration 12 h, rate limiting (10 tentatives / 5 min).

## Autorisation

Chaque endpoint protégé vérifie le rôle **côté serveur** (dépendances
`get_current_candidate` / `get_current_organizer`). Le frontend ne transmet
jamais un identifiant ou une filière « de confiance » : tout état autoritaire
vient de PostgreSQL.

## CSRF

Les requêtes qui modifient l'état exigent un en-tête `X-CSRF-Token` qui doit
correspondre au jeton de la session (candidat : claim `csrf` du JWT ; organisateur :
colonne `csrf_token` de la session).

## Autres mesures

- **CORS** restreint (`ALLOWED_ORIGINS`), cookies `SameSite`.
- **Headers** : `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`.
- **Injection SQL** : ORM SQLAlchemy paramétré.
- **Validation d'entrée** : Pydantic v2 strict.
- **Secrets** : clé privée de signature uniquement dans Cloudflare ; VAPID privé
  uniquement dans l'environnement ; jamais dans une image Docker.
- **Minimisation** : identification par `ensam_code`, aucun nom n'est utilisé
  comme identifiant ; un candidat ne reçoit jamais les données des autres.

## Journal d'audit

`attribution_events` est **append-only** : chaque opération (FIFO, manuel, undo,
return, cancel, restore) y est enregistrée avec l'état précédent/nouveau, la
filière, la position, l'organisateur, l'horodatage et la relation d'annulation
(`undo_of`). L'historique permet de reconstituer la séquence complète.

## Modèle de menace

FAME suit les bonnes pratiques OWASP (Top 10) : les failles d'authentification,
d'autorisation (IDOR), d'injection et de CSRF sont couvertes par les mécanismes
ci-dessus. Un audit externe (STRIDE/PASTA) peut être conduit séparément.
