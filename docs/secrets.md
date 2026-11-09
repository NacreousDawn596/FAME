# Gestion des secrets

Aucun secret n'est commité. Seuls les templates `*.example` le sont.

## Secrets applicatifs (`.env`)

| Variable | Rôle | Génération |
|---|---|---|
| `SESSION_SECRET` | Signature des sessions candidat (JWT HS256) | 32+ octets aléatoires |
| `SCHOOLAPP_PUBLIC_KEY` | Clé **publique** Ed25519 (vérifie les assertions) | `scripts/generate_keys.py` |
| `VAPID_PRIVATE_KEY` | Clé **privée** Web Push (signe les push) | `scripts/generate_keys.py` |
| `VAPID_PUBLIC_KEY` | Clé publique Web Push (abonnement navigateur) | `scripts/generate_keys.py` |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | — |

## Secrets Cloudflare Worker

| Secret | Rôle |
|---|---|
| `SCHOOLAPP_PRIVATE_KEY` | Clé **privée** Ed25519 (signe les assertions SchoolApp) — stockée via `npx wrangler secret put` |

La clé privée de signature ne vit **que** dans Cloudflare ; le backend ne
détient que la clé publique. Le frontend ne détient aucune clé.

## Génération des clés

```bash
cd backend && uv run python ../scripts/generate_keys.py
```

Produit :

- la paire Ed25519 SchoolApp (privée PKCS#8 → secret Worker, publique → `.env`) ;
- la paire VAPID EC P-256 (publique + privée → `.env`).

## Rotation

1. Régénérer les clés (`generate_keys.py`).
2. Worker : `npx wrangler secret put SCHOOLAPP_PRIVATE_KEY` + `npx wrangler deploy`.
3. Backend : mettre à jour `SCHOOLAPP_PUBLIC_KEY`, `VAPID_*` dans `.env`, redémarrer.
4. Les abonnements push existants deviennent invalides (410) et sont purgés
   automatiquement ; les étudiants se réabonnent au prochain chargement.
