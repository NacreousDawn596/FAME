# État de remédiation

| Finding | Sévérité | Statut | Correctif | Retest |
|---------|----------|--------|-----------|--------|
| FINDING-001 | Moyenne | ✅ Corrigé | Suppression des logs sensibles | Tests Worker passent |
| FINDING-002 | Moyenne | ✅ Corrigé | Conversion CJS des fichiers ESM | `require` + tests passent |
| FINDING-003 | Élevée | ✅ Corrigé | Épinglage origine des redirections | Tests Worker passent |
| FINDING-004 | Élevée | ✅ Corrigé | `react-router-dom@7.18.4` | `npm audit --omit=dev` = 0 |
| FINDING-005 | Critique | ✅ Corrigé | `cheerio@1.0.0` | `npm audit --omit=dev` = 0 + tests |
| FINDING-006 | Critique (dev) | 🟡 En attente | montée vitest/vite (breaking) | dev-only |

## Décision de publication

Aucune vulnérabilité **production** critique/élevée non résolue. Les constatations restantes sont confinées aux dépendances de développement (exclues du bundle de production) et ne bloquent pas la publication. Elles doivent être traitées lors d'une montée de version des outils de test.

## Acceptation des risques

- FINDING-006 : risque confiné aux environnements de développement/CI ; aucun chemin d'exploitation en production.
