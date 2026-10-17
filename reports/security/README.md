# Rapports de sécurité FAME

## Contenu

- [`threat-model.md`](threat-model.md) — modèle de menace (STRIDE).
- [`test-matrix.md`](test-matrix.md) — matrice menace→test avec outils, portée et limites.
- [`findings.md`](findings.md) — constatations avec sévérité, preuves, remédiation et retest.
- [`summary.json`](summary.json) — résumé machine-lisible.
- [`remediation-status.md`](remediation-status.md) — état des correctifs.
- [`tool-output/`](tool-output/) — sorties brutes des scanners (générés, non commités intégralement).

## Méthodologie

1. **Revue statique** du code (backend, frontend, Worker) et du paquet `schoolapp.js` audité.
2. **Scan de dépendances** : `npm audit` (web + worker), OWASP Dependency-Check (backend, `gradle dependencyCheckAnalyze`), `gitleaks` (CI).
3. **Tests actifs** : tous effectués uniquement contre l'environnement local (Testcontainers Postgres/Redis) et des comptes synthétiques. **Aucun** scan/attaque contre le service SchoolApp institutionnel ou des tiers.
4. **Analyse d'images** : `trivy` prévu en CI (non exécuté localement — binaire absent de l'environnement).

## Portée et limites (honnêtes)

- Les tests actifs couvrent l'authentification (assertions signées, rejeu, challenges), l'isolation inter-campagnes, la double affectation (concurrence), les transitions d'état invalides, et les exports (injection CSV neutralisée).
- **Non réalisé** faute d'outils locaux : DAST (OWASP ZAP), scan d'image Trivy, fuzzing réseau, SSRF contre mocks egress — documentés comme requérant un environnement dédié.
- **Requiert un spécialiste** : revue manuelle du flux SchoolApp réel (uniquement avec des comptes de test autorisés), test de charge 500 étudiants (playbook fourni), audit de conformité juridique (loi 09-08/CNDP, RGPD).

Aucun résultat n'est inventé. Les statuts reflètent les commandes réellement exécutées.
