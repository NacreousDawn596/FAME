# Tests de charge

Objectif PRD : 500 étudiants/min au point d'entrée d'inscription, latence de propagation des statuts 1–2 s.

## Exécution

```bash
k6 run --vus 500 --duration 60s tests/load/k6-registration.js \
  -e BASE_URL=http://localhost:8080 -e CAMPAIGN_ID=<uuid>
```

## Prérequis

- Stack démarrée (`docker compose up -d`).
- Campagne `ACTIVE` avec un roster importé.
- k6 installé (`brew install k6` / `apt install k6`).

## Statut

Le playbook est fourni et reproductible. **L'exécution n'a pas été réalisée** dans cet environnement (pas d'instance de charge dédiée avec les identités signées nécessaires pour le funnel complet). Le funnel complet (assertion signée → enregistrement) nécessite un jeu de clés de test et un serveur SchoolApp mocké.
