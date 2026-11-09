# Modèle de données

## Schéma relationnel

FAME utilise une base PostgreSQL normalisée. Toutes les entités sont définies en
SQLAlchemy 2 (async) dans `backend/app/models/`, et le schéma est géré par
Alembic (`backend/migrations/`).

### Tables

| Table | Rôle | Clé / unicité |
|---|---|---|
| `filieres` | Catalogue autoritaire des filières (37 enregistrements) | `code` PK |
| `candidates` | Un étudiant ENSAM | `ensam_code` UNIQUE |
| `queue_entries` | L'état de file d'un candidat (une entrée par candidat) | `candidate_id` UNIQUE |
| `companies` | L'entreprise de l'événement (une seule) | — |
| `recruiters` | Métadonnée des recruteurs (pas de file propre) | `company_id` FK |
| `organizers` | Comptes organisateurs | `username` UNIQUE |
| `organizer_sessions` | Sessions organisateur (token haché + CSRF) | `token_hash` UNIQUE |
| `attribution_events` | Journal d'audit **append-only** des attributions | — |
| `push_subscriptions` | Abonnements Web Push (multiples par candidat) | `endpoint` UNIQUE |
| `notification_events` | Notifications programmées | `deduplication_key` indexé |
| `notification_deliveries` | Livraison par abonnement (tentatives, erreurs) | `(event, subscription)` |

## Invariants

1. **Un candidat = une entrée de file.** `queue_entries.candidate_id` est unique.
   L'entrée est **réutilisée** à chaque transition d'état ; `joined_at` n'est
   jamais réécrit — c'est ce qui permet de restaurer exactement la position d'un
   candidat après une annulation.
2. **La position n'est jamais persistée.** Elle est calculée à la volée :
   `COUNT(*)` des candidats en attente de la même filière avec
   `(joined_at, id)` antérieur, ou une fonction fenêtre `ROW_NUMBER()` pour les
   vues de l'organisateur.
3. **Le journal d'audit est append-only.** Aucun `DELETE` ; une annulation crée un
   nouvel événement `UNDO` qui référence l'événement d'origine via `undo_of`.
4. **`ensam_code` est l'identifiant unique du candidat.** Le nom n'est qu'un
   attribut d'affichage.

## Cohérence et concurrence

- L'attribution FIFO utilise `SELECT … FOR UPDATE SKIP LOCKED` pour verrouiller la
  ligne du candidat le plus ancien sans bloquer les autres requêtes. Deux
  attributions concurrentes ne peuvent pas attribuer le même candidat.
- `queue_entries.version` sert d'horodatage de version (incrémenté à chaque
  transition) pour le verrouillage optimiste.
- La déduplication des notifications se fait par `deduplication_key` sur une
  fenêtre temporelle (60 s).

## Seed

Le catalogue des filières est défini dans `backend/app/seed/filieres.py` et
inséré par la migration initiale **et** par le seed d'idempotence
(`backend/app/seed/seed.py`). La compagnie par défaut et les organisateurs
bootstrap (via `ORGANIZER_INITIAL_EMAILS`) sont créés au démarrage.
