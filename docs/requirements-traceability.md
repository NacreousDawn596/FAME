# Matrice de traçabilité des exigences

Légende : ✅ implémenté + testé · 🟡 implémenté, test partiel · ⬜ non implémenté

| US / exigence | Description | Statut | Test(s) |
|---------------|-------------|--------|---------|
| US 0.1 | Campagnes isolées (file, QR, données) | ✅ | `QueueEngineIntegrationTest.crossCampaignAccessIsRejected` |
| US 0.2 | Ségrégation des droits régulateur | ✅ | `CampaignAccessService` + tests d'accès croisé |
| US 0.3 | Photo/nom du régulateur | ✅ | `AppUser.photoUrl` (staff) / `Recruiter.photoUrl` |
| US 1.1–1.4 | Profils entreprise, postes, filière par table | ✅ | `StationService`, `CompanyService` |
| US 1.5 | Jumeau numérique 2D | ✅ | `RoomMapPage` + `saveLayout` |
| US 2.1 | QR code d'inscription | ✅ | `/register/:campaignId` + route publique |
| US 2.2 | SSO institutionnel | ✅ (auth par identifiant SchoolApp) | Worker tests |
| US 2.3 | Double validation (niveau 5A + liste blanche) | ✅ | `AuthService.authenticateStudent` |
| US 2.4 | Horodatage + session + rang | ✅ | `QueueEngine.register` (serveur) |
| US 2.5 | Blocage anti-fraude (non-éligible) | ✅ | `NOT_ELIGIBLE` (403) |
| US 2.6 | Compte de secours | ✅ | `RecoveryController` + `AuthService.createRecovery` |
| US 2.7 | Récupération d'autonomie (chgt mdp) | ✅ | `changeRecoveryPassword` |
| US 2.8/2.9 | Abandon volontaire + retrait filtres | ✅ | `QueueEngine.withdraw` |
| US 3.1/3.2 | Filtrage FIFO dynamique | ✅ | `preservesFifoTieBreakOrdering` |
| US 3.3 | Anti-famine (autres filières) | ✅ | `alternativeCandidates` |
| US 4.1/4.2 | Appel + notification + statut | ✅ | `candidateIsLockedAfterCall` |
| US 4.3 | Verrouillage anti-collision | ✅ | `concurrentClaimsNeverDoubleAssign` |
| US 4.4 | Orientation spatiale (nom/photo/lieu) | ✅ | `Views.station` + call banner |
| US 4.5 | Sas buffer (préparation) | ✅ | `prepareDispatch` |
| US 4.6 | Écran public | ✅ | `PublicDisplayController` (champs restreints) |
| US 4.7 | Pré-alerte top 3 | ✅ | `preAlertTopThree` |
| US 5.1–5.4 | Confirmation présence, no-show, absence | ✅ | `confirmPresence`, `markAbsent` |
| US 6.1–6.5 | Supervision spatiale, pause/reprise | ✅ | `pauseStation`, `resumeStation` |
| US 6.6 | Fin de parcours étudiant | ✅ | `completeInterview` → `COMPLETED` |
| US 6.7 | Routage multi-campagnes | 🟡 | session centrale conservée ; redirection étudiante à compléter |
| US 7.1 | Historisation des événements | ✅ | `QueueEvent` + `AuditService` |
| US 7.2 | KPIs + export | ✅ | `AnalyticsService` + `ExportService` |
| NFR 3.1 | 500 étudiants/min, 1–2 s de propagation | 🟡 | test de charge fourni, exécution à confirmer |
| NFR 3.2 | Étanchéité des profils + expiration sessions | ✅ | canal SSE par étudiant ; `spring.session.timeout` |
| NFR 3.3 | Mobile-first, responsive, tactile 2D | ✅ | CSS responsive + drag pointer events |
| NFR 3.4 | Résilience d'état | ✅ | état durable côté serveur |

## Décisions métier en attente

1. **Pénalité no-show** : politique de report/requeue à définir (aucune règle universelle imposée — voir Gap Analysis « Absences »).
2. **Participation à la conférence** : exigence « souhaitable » (Gap 3.6) non verrouillée par une règle — à trancher.
3. **Mode d'affichage public** (`FIRST_NAME` vs `CODE`) : configurable, défaut prénom.
