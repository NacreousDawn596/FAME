# Release & rollback — checklist

## Avant publication

- [ ] `./gradlew test` (backend) — vert.
- [ ] `npm test` + `npm run build` (web) — verts.
- [ ] `npm test` (worker) — vert.
- [ ] `npm audit --omit=dev` (web + worker) — 0 vulnérabilité production.
- [ ] OWASP Dependency-Check (backend) — pas de Critique/Élevée non résolue.
- [ ] `gitleaks` — aucun secret détecté.
- [ ] Migrations Flyway testées depuis un schéma propre.
- [ ] `docker compose up -d --build` — stack saine (healthchecks verts).
- [ ] Backup de la base avant montée de version.
- [ ] Secrets configurés (Worker + API + VAPID).

## Rollback

1. `docker compose down`.
2. Re-déployer l'image précédente (`docker tag`/registre).
3. Restaurer le backup si le schéma a changé (`infra/scripts/restore.sh`).
4. Réexécuter `docker compose up -d` + healthchecks.

## Échec d'une campagne (jour J)

- Le plus critique est la disponibilité : garder un snapshot PostgreSQL prêt à restaurer, et un second jeu de clés VAPID/Worker pour rotation rapide.
- L'écran public + notifications in-app assurent la redondance si le push échoue.
