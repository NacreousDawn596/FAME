# Modèle de menace (STRIDE)

## Actifs

1. **Données personnelles étudiantes** (CNE/Masar, email institutionnel, identité, filière) — sensibles (loi 09-08, RGPD).
2. **Sessions & identités** (cookies de session, assertions signées, challenges).
3. **Intégrité de la file d'attente** (ordre FIFO, affectations, horodatages).
4. **Disponibilité** pendant la fenêtre critique de l'événement.
5. **Données analytiques** (KPIs, exports).

## Frontières de confiance

- **Étudiant** ↔ **Worker** ↔ **SchoolApp** : seuls identifiants transmis une fois ; assertion signée en retour.
- **Étudiant/Régulateur/Admin** ↔ **API** : sessions applicatives (Redis), autorisation serveur.
- **Public** ↔ **API** : feed d'affichage restreint, non authentifié mais sans données privées.
- **Infra** : PostgreSQL/Redis sur réseau interne uniquement.

## Menaces par catégorie STRIDE

| Catégorie | Menace | Contre-mesures |
|-----------|--------|----------------|
| **S**poofing | Usurpation d'identité étudiante | Assertion Ed25519 signée, challenge+nonce à usage unique, vérification du niveau 5A + liste blanche. |
| | Usurpation staff | BCrypt(12), rate-limiting de login, messages génériques (pas d'énumération). |
| **T**ampering | Manipulation de la file (ordre, filière) | Serveur autoritaire ; séquence/horodatage serveur ; pas de confiance aux entrées client. |
| | Falsification d'assertion | Signature vérifiée, issuer/audience/expiration strictes, anti-rejeu atomique. |
| **R**epudiation | Négation d'action administrative | `QueueEvent` (audit) avec acteur, entité, action, horodatage serveur. |
| **I**nformation disclosure | Fuite inter-étudiants / inter-campagnes | DTO par rôle, canal SSE par étudiant, `CampaignAccessService`, feed public restreint. |
| | Fuite de secrets dans les logs | Aucun log de mot de passe/CSRF/assertion ; payloads push minimaux. |
| **D**enial of service | Afflux 500 étudiants/min | Rate-limiting (Redis), limites de taille de requête, timeouts, healthchecks. |
| | Épuisement de ressources | Limites CPU/mémoire Compose, `MAX_BODY_BYTES` Worker, pool Hikari borné. |
| **E**levation of privilege | IDOR/BOLA inter-campagnes | Autorisation re-vérifiée sur chaque identifiant (pas de confiance aux IDs client). |
| | Mass assignment | DTO stricts (records), jamais de sérialisation directe d'entités. |

## Menaces spécifiques FAME (business logic)

- **Double affectation** (deux régulateurs, même candidat) → `SELECT ... FOR UPDATE SKIP LOCKED` + `@Version` + test de concurrence automatisé.
- **Famine de file** (pas de candidat sur la filière) → alerte explicite + suggestion FIFO d'autres filières, sans affectation implicite.
- **Contournement de conférence** (Gap 3.6) → exigence « souhaitable », non verrouillée par règle (décision métier en attente).
- **Compte de secours abusif** → uniquement après vérification physique, identifiant/mdp aléatoires à usage unique, changement de mdp obligatoire, expiration 30 min.

## Hypothèses hors périmètre

- La sécurité du service SchoolApp lui-même n'est pas testée (tiers).
- La conformité légale (CNDP/RGPD) nécessite une revue juridique dédiée, non réalisée ici.
