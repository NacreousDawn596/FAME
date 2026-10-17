# Backups & restauration

## Principe

PostgreSQL est l'unique source de vérité durable. Redis ne contient que sessions/cache (reconstructible). La file d'attente est reconstruite depuis la base, jamais depuis le navigateur.

## Sauvegarde

```bash
infra/scripts/backup.sh /backups/fame-$(date +%F).sql.gz fame-postgres-1
```

`pg_dump -Fc` (format custom, compressible) → fichier `.gz`.

## Restauration (environnement isolé)

```bash
infra/scripts/restore.sh /backups/fame-2026-01-01.sql.gz fame-postgres-1
```

`pg_restore --clean --if-exists --no-owner` dans une base vide/isolée.

## Test de restauration (recommandé)

1. Démarrer un environnement jetable (`docker compose -f docker-compose.test.yml up -d postgres`).
2. Restaurer le backup dans cette base.
3. Vérifier l'intégrité : `SELECT count(*) FROM student_registration;` et lancer la suite de tests.

## Récupération d'incident

- **Backend redémarré** : la file est relue depuis PostgreSQL ; les candidats réclamés (`CALLED`/`IN_INTERVIEW`) restent réclamés.
- **Redis interrompu** : l'API dégrade (sessions nouvelles impossibles tant que Redis est down, car `spring-session` est en Redis) ; la file et les données persistent dans PostgreSQL. Redémarrer Redis pour rétablir sessions/temps réel.
- **PostgreSQL interrompu** : restaurer depuis le dernier backup + rejouer les WAL si configuré.
