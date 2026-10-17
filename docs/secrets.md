# Gestion des secrets

## Principes

- Aucun secret n'est commité. Seuls des placeholders descriptifs existent dans `.env.example`.
- Les mots de passe SchoolApp ne sont **jamais** stockés (ni en base, ni en Redis, ni en logs).
- La clé privée de signature ne vit que dans les secrets Cloudflare Worker.
- Les mots de passe utilisateurs (staff, comptes de secours) sont hachés avec **BCrypt (cost 12)**.

## Emplacements

| Secret | Emplacement |
|--------|-------------|
| `SIGNING_PRIVATE_KEY` (Ed25519) | Secret Cloudflare Worker (`wrangler secret`) |
| `FAME_WORKER_PUBLIC_KEY` | Variable API (clé publique — non secrète mais config requise) |
| `FAME_VAPID_PRIVATE_KEY` | Secret plateforme (Compose secrets / gestionnaire de secrets) |
| `POSTGRES_PASSWORD`, `REDIS_PASSWORD` | Secrets plateforme |
| `FAME_ADMIN_PASSWORD` | Variable d'env (bootstrap) — à changer après premier login |

## Rotation

1. **Clé de signature Worker** : générer une nouvelle paire, `wrangler secret put`, redéployer, mettre à jour `FAME_WORKER_PUBLIC_KEY` côté API, redémarrer l'API. Les assertions signées par l'ancienne clé deviennent invalides (durée de vie < 90 s).
2. **VAPID** : régénérer (`npx web-push generate-vapid-keys`), mettre à jour les variables API, redémarrer. Les abonnements existants restent valides (le `endpoint` et les clés client ne changent pas).
3. **Mot de passe admin** : login → à changer manuellement (ou recréer le compte).

## Détection de fuite

`gitleaks` est exécuté dans le CI (`gitleaks-action`). Ne jamais placer de clé/token/mot de passe dans les fichiers suivis.
