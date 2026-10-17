# Modèle de données

```mermaid
erDiagram
    APP_USER ||--o{ CAMPAIGN : "owner"
    APP_USER ||--o{ CAMPAIGN_MEMBER : ""
    CAMPAIGN ||--o{ CAMPAIGN_MEMBER : ""
    COMPANY ||--o{ CAMPAIGN : ""
    COMPANY ||--o{ RECRUITER : ""
    CAMPAIGN ||--o{ ROSTER_ENTRY : ""
    CAMPAIGN ||--o{ STATION : ""
    RECRUITER ||--o{ STATION : ""
    CAMPAIGN ||--o{ STUDENT_REGISTRATION : ""
    STATION ||--o{ STUDENT_REGISTRATION : ""
    CAMPAIGN ||--o{ QUEUE_EVENT : ""
    STUDENT_REGISTRATION ||--o{ PUSH_SUBSCRIPTION : ""
    CAMPAIGN ||--o{ RECOVERY_ACCOUNT : ""
    CAMPAIGN ||--o{ AUTH_CHALLENGE : ""
    STUDENT_REGISTRATION ||--o{ NOTIFICATION_RECORD : ""

    APP_USER {
      uuid id PK
      string username UK
      string password_hash
      string display_name
      role role
      bool enabled
    }
    CAMPAIGN {
      uuid id PK
      string name
      uuid company_id FK
      uuid owner_id FK
      CampaignStatus status
      bool public_display_enabled
      bigint version
    }
    ROSTER_ENTRY {
      uuid id PK
      uuid campaign_id FK
      string student_code
      string email
      string full_name
      string filiere
      UK (campaign_id, student_code)
    }
    STATION {
      uuid id PK
      uuid campaign_id FK
      uuid recruiter_id FK
      string filiere
      StationStatus status
      double pos_x
      double pos_y
      bigint version
    }
    STUDENT_REGISTRATION {
      uuid id PK
      uuid campaign_id FK
      string student_code
      string email
      string full_name
      string filiere
      bigint sequence_no
      timestamp arrival_at
      QueueStatus status
      uuid station_id FK
      bigint version
      UK (campaign_id, student_code)
    }
    QUEUE_EVENT {
      uuid id PK
      uuid campaign_id
      string entity_type
      string entity_id
      string actor_id
      string action
      timestamp occurred_at
      text metadata
    }
```

## Notes de cohérence

- **FIFO** : `sequence_no` est alloué via la séquence PostgreSQL `registration_seq` (monotone, déterministe). `arrival_at` est fixé côté serveur.
- **Contrainte d'unicité** : `(campaign_id, student_code)` empêche l'inscription en double au niveau base de données.
- **Isolation multi-locataire** : l'isolation logique (colonne `campaign_id` + vérifications d'autorisation systématiques dans `CampaignAccessService` et le `QueueEngine`) est choisie plutôt qu'une base par campagne ; les tests d'isolation inter-campagnes (accès croisé rejeté) sont automatisés.
- **Concurrence** : l'affectation utilise `SELECT ... FOR UPDATE SKIP LOCKED` (verrouillage pessimiste) + colonnes `@Version` pour les mises à jour de stations.
- **Migrations** : Flyway (`V1__init.sql`). Test d'installation propre + montée de version.
- **Suppression/archivage** : les campagnes `ARCHIVED` restent consultables ; les `roster_entry`, `station`, `student_registration` référencent la campagne avec `ON DELETE CASCADE` pour un nettoyage administrateur.
