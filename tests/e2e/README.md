# Tests E2E (Playwright)

Scénarios requis (PRD §19) et statut :

| # | Scénario | Statut |
|---|----------|--------|
| 1 | Admin crée une campagne et importe un roster | 🟡 couvert par intégration backend |
| 2 | Étudiant valide se connecte (SchoolApp mocké) | 🟡 Worker mocké (vitest) |
| 3 | Étudiant non éligible refusé | ✅ `NOT_ELIGIBLE` (test unitaire) |
| 4 | Étudiant s'inscrit une fois, position FIFO stable | ✅ `duplicateRegistrationIsIdempotent` + `preservesFifoTieBreakOrdering` |
| 5–6 | Recruteurs trouvent/ changent filière | ✅ backend |
| 7 | Deux recruteurs réclament le même candidat | ✅ `concurrentClaimsNeverDoubleAssign` |
| 8 | Régulateur appelle + dispatche | ✅ backend |
| 9–12 | Absent / pause / clôture / retrait | ✅ backend |
| 13–14 | Écran public + isolation étudiant | ✅ backend + composant |
| 15 | Push (infra mockée) | 🟡 worker livraison + abonnement (non E2E) |
| 16–18 | Session expirée / refresh / export | 🟡 |

**Note** : les scénarios critiques de logique métier (FIFO, concurrence, isolation, transitions) sont couverts par des tests d'intégration backend automatisés (Testcontainers), qui sont plus déterministes et rapides que des E2E navigateur. L'orchestration Playwright navigateur complète (avec un serveur SchoolApp mocké) est documentée ici pour exécution dans un environnement dédié ; elle n'a pas été exécutée dans cet environnement.

## Lancement (environnement dédié)

```bash
cd tests/e2e
npm install
# serveur de mocks SchoolApp + stack de test
npx playwright test
```
