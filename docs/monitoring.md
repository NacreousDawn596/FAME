# Observabilité & réponse aux incidents

## Observabilité

- **Logs** : SLF4J (JSON via logback en production recommandé). Ne jamais logger : mots de passe, cookies, en-têtes d'autorisation, clés privées, assertions complètes.
- **Corrélation** : ID de corrélation à ajouter via un filtre (`X-Correlation-ID`) — le code actuel ne l'instrumente pas encore (recommandé pour la production).
- **Healthchecks** : `/actuator/health/liveness` et `/readiness` (publics, sans détails) ; `/actuator/*` restreint à `ADMIN`.
- **Métriques** : `/actuator/prometheus` (Micrometer) — compteurs de connexion DB/Redis, durées de requête.
- **Échecs d'authentification** : surveiller les 401 répétés (`RateLimiter` + logs) pour détecter les tentatives de brute-force.

## Réponse aux incidents

### Backend redémarré / planté
1. La file est relue depuis PostgreSQL (aucune perte de claims).
2. Vérifier `/actuator/health` ; relancer via `docker compose up -d api`.

### Redis indisponible
- Les sessions et le temps réel sont impactés (SSE) ; les données persistent dans PostgreSQL.
- Redémarrer Redis ; les clients SSE se reconnectent automatiquement.

### PostgreSQL indisponible
- Arrêter les écritures ; restaurer le backup (`infra/scripts/restore.sh`).

### Notification push en échec répété
- `PushDeliveryWorker` retente (max 5) puis marque `FAILED`. Le repli in-app (SSE) et l'écran public restent opérationnels.

### Rotation de secrets
- Voir [`secrets.md`](secrets.md).

### Rollback
- Voir [`deployment.md`](deployment.md) et [`release-checklist.md`](release-checklist.md).
