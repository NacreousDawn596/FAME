# PROJECT.md — FAME (File d'Attente & Attribution des Recrutements)

> **Context & Purpose for Coding Agents:**  
> This file is the single, authoritative architectural and operational specification for FAME. If you are an AI assistant or human engineer making changes to this repository, read and follow every section of this document carefully.

---

## 1. Executive Summary & Purpose

**FAME** is an enterprise-grade, real-time candidate queue and interview attribution platform built specifically for university recruitment forums and career days (engineered for ENSAM Meknès — Université Moulay Ismaïl).

### The Problem It Solves
Traditional university hiring forums rely on physical paper sheets, megaphones/loud calling, uncoordinated spreadsheets across multiple rooms, and manual candidate routing. This leads to bottlenecks, lost candidates, unfair ordering, and zero auditable trail.

### How FAME Operates
- **Single-Company Multi-Filière Recruitment Event**: Models an event with 1 target company, 1 or more organizers/regulators across physical interview rooms, and hundreds of student candidates divided into academic tracks (*filières*).
- **Zero-Friction Authentication**: Students authenticate using their existing ENSAM **SchoolApp** credentials through an isolated Cloudflare Worker, which returns a cryptographically signed identity assertion (Ed25519).
- **Strict, Deterministic FIFO**: Candidates join independent FIFO queues per filière. Queue position is **dynamically calculated** on `(joined_at, id)`, never stored statically.
- **Atomic Attribution & Concurrency**: Organizers attribute the next candidate via PostgreSQL row-level locks (`SELECT ... FOR UPDATE SKIP LOCKED`), eliminating double-attribution even with concurrent regulators.
- **Multichannel Notifications**: Real-time Web Push (VAPID) delivered to installed PWAs, background fallback via WhatsApp Web bridge (`whatsapp-web.js`), and email logging.
- **Complete Reversibility & Auditability**: Every single state change is recorded in an immutable, append-only `attribution_events` table and detailed `activity_logs`. Any attribution can be undone, restoring the candidate safely to the queue or marking completion.
- **Live Public Hall Screen**: Unauthenticated `/public` display view showing active summons, room assignments, and approaching ticket numbers.

---

## 2. System Architecture & Topology

```
                                  ┌──────────────────────────────────────────────┐
                                  │   ENSAM SchoolApp Core API                   │
                                  │   (https://schoolapp.ensam-umi.ac.ma)        │
                                  └──────────────────────┬───────────────────────┘
                                                         │ upstream auth
                                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │   Cloudflare Worker (schoolapp.js)           │
                                  │   • Uses vendor/schoolapp client             │
                                  │   • Signs JWT assertion with Ed25519         │
                                  │     (SCHOOLAPP_PRIVATE_KEY secret)           │
                                  └──────────────────────┬───────────────────────┘
                                                         │ short-lived signed JWT
                                                         ▼
┌─────────────────────────────────┐   HTTP REST (JSON)   ┌──────────────────────────────────────────────┐
│   fame-react (Client PWA)       ├─────────────────────►│   FastAPI Backend (api:8000)                 │
│   • React 19 + TypeScript 5.7   │   WebSocket (/ws/*)  │   • Verifies SchoolApp Ed25519 assertion     │
│   • Hash routing (#/student,    │◄────────────────────►│   • Verifies Organizer Argon2id password     │
│     #/organizer, #/public)      │                      │   • Manages FIFO queues & attributions       │
│   • Service Worker & Push API   │                      │   • Emits WebSocket events                   │
└─────────────────────────────────┘                      └───────────────┬──────────────┬───────────────┘
                                                                         │              │
                                                       SQLAlchemy Async  │              │ Redis / ARQ
                                                                         ▼              ▼
                                                 ┌──────────────────────────┐    ┌──────────────────────┐
                                                 │   PostgreSQL 16          │    │   Redis 7            │
                                                 │   • Authors state        │    │   • Rate-limiting    │
                                                 │   • Row locks / FIFO     │    │   • ARQ job queue    │
                                                 │   • Immutable audit logs │    └──────────┬───────────┘
                                                 └──────────────────────────┘               │
                                                                                            ▼
                                                                                 ┌──────────────────────┐
                                                                                 │   ARQ Worker (worker)│
                                                                                 │   • pywebpush (VAPID)│
                                                                                 │   • WhatsApp bridge  │
                                                                                 │   • Email channel    │
                                                                                 └──────────────────────┘
```

### Production Network Packaging
- All frontend assets and backend APIs are unified behind **Nginx** reverse proxy exposed on a single configurable port (`PORT=5483`).
- `/api/` and `/ws/` reverse-proxy to the FastAPI backend (`http://api:8000`).
- `/` serves the static compiled React PWA.
- Local WhatsApp bridge runs on `host.docker.internal:3000` via Puppeteer/WhatsApp Web.

---

## 3. Technology Stack & Key Dependencies

| Layer | Technology | Key Libraries & Versions | Purpose |
|---|---|---|---|
| **Backend** | Python 3.12+ / FastAPI | `fastapi 0.115+`, `uvicorn`, `pydantic v2`, `pydantic-settings` | High-performance asynchronous REST and WebSocket API |
| **Database ORM** | SQLAlchemy 2.0 (Async) | `sqlalchemy[asyncio] 2.0.36+`, `asyncpg`, `alembic` | Asynchronous Postgres queries, connection pooling, and schema migrations |
| **Job Queue** | ARQ + Redis | `arq 0.26+`, `redis 5.1+` | Non-blocking execution of Web Push, WhatsApp, and email deliveries |
| **Security / Crypto** | Python Cryptography | `cryptography 43+`, `pyjwt[crypto]`, `argon2-cffi` | Ed25519 assertion verification, Argon2id password hashing, session tokens |
| **Notifications** | Web Push & WhatsApp | `pywebpush 2.0+`, `whatsapp-web.js` (bridge), `httpx` | Push notifications, WhatsApp messages, and email updates |
| **Frontend** | React 19 + TypeScript | `react 19`, `react-dom 19`, `typescript 5.7`, `vite 8` | Candidate mobile PWA, organizer dashboard, and public screen |
| **Auth Bridge** | Cloudflare Workers | WebCrypto Ed25519, `vendor/schoolapp` (vendored client) | Decoupled candidate authentication against ENSAM's upstream portal |
| **Containerization** | Docker & Compose | Docker Compose v2, Alpine-based images, Nginx 1.27 | Reproducible deployment and isolated services |

---

## 4. Repository Directory Structure

```
fame/
├── backend/                             # Python / FastAPI Backend application
│   ├── alembic.ini                      # Alembic migration configuration
│   ├── pyproject.toml                   # uv / pip dependency declarations
│   ├── uv.lock                          # Pinned dependency lockfile
│   ├── entrypoint.sh                    # Container start script (runs migrations then app)
│   ├── app/
│   │   ├── main.py                      # FastAPI app instance, CORS, lifespan, security headers
│   │   ├── config.py                    # Pydantic Settings (environment loading & validation)
│   │   ├── database.py                  # SQLAlchemy async engine, SessionFactory, get_session dep
│   │   ├── redis_client.py              # Global async Redis client
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── v1/
│   │   │       ├── __init__.py          # API router registry (prefixes /auth, /candidate, etc.)
│   │   │       ├── auth.py              # Candidate auth endpoints (/auth/schoolapp, /auth/me)
│   │   │       ├── candidate.py         # Candidate endpoints (/candidate/me, /withdraw, /contact)
│   │   │       ├── organizer.py         # Organizer auth, queues, attribution, summon, undo
│   │   │       ├── public.py            # Public display board data (/public/display)
│   │   │       └── config.py            # Public system config (/config/public)
│   │   ├── models/                      # SQLAlchemy Declarative Models
│   │   │   ├── __init__.py              # Re-exports all models
│   │   │   ├── enums.py                 # QueueStatus, AttributionOperation, NotificationEventType
│   │   │   ├── candidate.py             # Filiere, Candidate, QueueEntry models
│   │   │   ├── company.py               # Company, Recruiter models
│   │   │   ├── organizer.py             # Organizer, OrganizerSession models
│   │   │   ├── attribution.py           # AttributionEvent (immutable audit log)
│   │   │   ├── notification.py          # PushSubscription, NotificationEvent, NotificationDelivery
│   │   │   └── activity.py              # ActivityLog (append-only system activity log)
│   │   ├── schemas/                     # Pydantic Request / Response schemas
│   │   │   ├── auth.py                  # SchoolAppAuthRequest, OrganizerLoginRequest, etc.
│   │   │   ├── candidate.py             # CandidateProfile, ContactUpdateRequest, PushSub schemas
│   │   │   ├── organizer.py             # QueueSummary, FIFOAttributeRequest, CandidateSearchRow
│   │   │   └── config.py                # PublicConfig schemas
│   │   ├── security/                    # Cryptographic & Auth utilities
│   │   │   ├── deps.py                  # FastAPI dependency injectors (CurrentCandidate, CurrentOrganizer)
│   │   │   ├── tokens.py                # Ed25519 assertion verification & JWT creation/decoding
│   │   │   ├── passwords.py             # Argon2id password hashing and verification
│   │   │   ├── csrf.py                  # Double-submit cookie / header CSRF validation
│   │   │   └── rate_limit.py            # Redis fixed-window rate limiters
│   │   ├── services/                    # Domain logic & services
│   │   │   ├── queue.py                 # Queue position calculator, registration, withdrawal
│   │   │   ├── attribution.py           # FIFO attribute, manual attribute, undo, arrive, complete
│   │   │   ├── filiere.py               # Filière normalization & fuzzy matcher (37 ENSAM tracks)
│   │   │   ├── notifications.py         # Notification event scheduler & threshold triggers
│   │   │   ├── channels.py              # Multichannel dispatch (WhatsApp, FormSubmit email)
│   │   │   ├── webpush.py               # pywebpush VAPID caller
│   │   │   ├── jobs.py                  # ARQ Redis queue dispatcher (enqueue_job)
│   │   │   └── activity.py              # Activity logging service (log_activity)
│   │   ├── websocket/                   # Real-time WebSocket handlers
│   │   │   ├── manager.py               # ConnectionManager (filière rooms + organizer rooms)
│   │   │   └── routes.py                # WS endpoints (/api/v1/ws/candidate, /api/v1/ws/organizer)
│   │   ├── workers/                     # Background job processors
│   │   │   └── notifications.py         # ARQ WorkerSettings & deliver_notification job
│   │   ├── repositories/                # Optimized query layer
│   │   │   └── organizer.py             # CTE-based queue status, public display, dashboard aggregations
│   │   └── seed/                        # Idempotent seed data
│   │       ├── filieres.py              # Canonical list of 37 ENSAM filières
│   │       └── seed.py                  # Seeds filières, initial company, and bootstrap organizers
│   ├── migrations/                      # Alembic database migrations
│   │   ├── env.py                       # Async migration runner
│   │   └── versions/                    # Migration scripts
│   └── tests/                           # Pytest test suite (against real PostgreSQL)
│       ├── conftest.py                  # Test database fixtures, engine setup, auto-rollback
│       ├── test_attribution.py          # Concurrency, FIFO ordering, undo, double-attribution tests
│       ├── test_queue.py                # Registration, deduplication, position calculation tests
│       ├── test_security.py             # Ed25519 signature validation, Argon2id, CSRF checks
│       ├── test_notifications.py        # Scheduling, deduplication keys, threshold triggers
│       ├── test_filiere.py              # Filière fuzzy matching tests
│       ├── test_public.py               # Public display tests
│       └── test_api_integration.py      # End-to-end HTTP flows
├── fame-react/                          # React Frontend SPA & PWA
│   ├── index.html                       # HTML5 entrypoint with PWA meta tags
│   ├── package.json                     # Frontend scripts and dependencies
│   ├── vite.config.ts                   # Vite configuration (proxies /api and /ws to :8000)
│   ├── tsconfig.json                    # Strict TypeScript configuration
│   ├── public/
│   │   ├── sw.js                        # Service worker (push, notification clicks, caching)
│   │   ├── manifest.webmanifest         # PWA Manifest (standalone, theme colors, icons)
│   │   └── icons/                       # PWA icons (192x192, 512x512, maskable)
│   └── src/
│       ├── main.tsx                     # Mounts React, registers Service Worker
│       ├── App.tsx                      # Hash-based router (#/login, #/confirm, #/student, #/organizer, #/public)
│       ├── api.ts                       # Typed fetch wrapper with CSRF injection & error classes
│       ├── auth.ts                      # Client-side session storage (localStorage + cookie sync)
│       ├── ws.ts                        # Reconnecting WebSocket client
│       ├── pwa.ts                       # PWA install prompt handler & status tracking
│       ├── types.ts                     # TypeScript interfaces matching backend models & schemas
│       ├── index.css                    # Handcrafted, modern CSS design system
│       ├── components/
│       │   └── Shared.tsx               # Header, Logo, SVG Icons, Footer, MobileShell
│       └── pages/
│           ├── LoginPage.tsx            # SchoolApp student login & Organizer login forms
│           ├── ConfirmContact.tsx       # Mandatory post-login contact confirmation (Email + WhatsApp)
│           ├── StudentPage.tsx          # Real-time ticket, queue position, estimated wait, leave queue
│           ├── OrganizerPage.tsx        # Dispatcher dashboard, FIFO buttons, search, live summons countdown
│           └── PublicPage.tsx           # Large-screen live call board with auto-refresh & ticker
├── bridge/                              # WhatsApp Web Bridge (Node.js)
│   ├── bridge.js                        # Express server running whatsapp-web.js with QR web endpoint
│   └── package.json                     # Bridge dependencies
├── vendor/schoolapp/                    # Vendored SchoolApp client library
│   └── src/                             # Upstream schoolapp.js client code
├── infra/                               # Deployment configuration
│   ├── docker/
│   │   ├── backend.Dockerfile           # Multi-stage Python 3.12-slim build
│   │   └── frontend.Dockerfile          # Multi-stage Node 22 build -> Nginx static server
│   └── nginx/
│       ├── nginx.conf                   # Main reverse proxy configuration
│       └── frontend.conf                # Static file caching & header configuration
├── scripts/                             # Utility & administrative CLI scripts
│   ├── create_organizer.py              # Interactive organizer user creation CLI
│   └── generate_keys.py                 # Generates fresh Ed25519 & VAPID EC P-256 keypairs
├── docs/                                # Technical documentation specifications
│   ├── architecture.md
│   ├── authentication.md
│   ├── database.md
│   ├── queue.md
│   ├── notifications.md
│   ├── pwa.md
│   ├── security.md
│   ├── secrets.md
│   ├── deployment.md
│   └── development.md
├── docker-compose.yml                   # Production & local orchestrator (postgres, redis, api, worker, frontend, nginx)
├── schoolapp.js                         # Cloudflare Worker script for Ed25519 assertion signing
├── wrangler.toml                        # Cloudflare Worker deployment configuration
├── Makefile                             # Common developer commands (up, dev, test, migrate, seed, etc.)
├── flake.nix / flake.lock               # Reproducible Nix development environment
└── README.md                            # High-level overview & developer quickstart
```

---

## 5. Domain Model & Database Schema

All database interactions use **PostgreSQL 16** via **SQLAlchemy 2.0 Async**.

### Core Tables

1. `filieres`
   - Master list of 37 accredited academic programs at ENSAM Meknès.
   - Primary Key: `code` (e.g., `GI-ILSI`, `GIM-GMS`, `GE-ESEL`).
   - Fields: `intitule`, `departement`, `accreditation`.

2. `candidates`
   - Represents an ENSAM student. Unique on `ensam_code` (e.g. `19001234` or CNE/Massar).
   - Fields: `id`, `ensam_code` (unique, indexed), `first_name`, `last_name`, `year`, `email`, `phone`, `filiere_code` (FK -> `filieres.code`).

3. `queue_entries`
   - Represents a candidate's position and status in the recruitment queue.
   - One row per candidate: `candidate_id` is unique.
   - Fields:
     - `candidate_id` (FK -> `candidates.id`, unique)
     - `filiere_code` (FK -> `filieres.code`, indexed)
     - `status`: `WAITING` | `ATTRIBUTED` | `CANCELLED` | `WITHDRAWN` | `COMPLETED`
     - `joined_at`: Timestamp (UTC) when candidate entered the queue. **Never overwritten** during normal transitions, preserving deterministic queue position.
     - `attributed_at`: Timestamp (UTC) of attribution.
     - `cancelled_at`: Timestamp (UTC) of cancellation.
     - `regulator`: Name of the interview regulator who dispatched them.
     - `room`: Name of the assigned interview room (e.g., "Salle 1", "Stand B").
     - `version`: Monotonically increasing integer for optimistic locking.

4. `companies` & `recruiters`
   - Event context: Exactly one target hiring company is active per event instance (`companies`).
   - `recruiters`: Informational metadata linked to `company_id`.

5. `organizers` & `organizer_sessions`
   - `organizers`: Committee members with password login (`username`, `password_hash` using Argon2id, `email`).
   - `organizer_sessions`: Opaque token-based sessions. Holds `token_hash` (SHA-256 of cookie token), `organizer_id`, `csrf_token`, `expires_at`.

6. `attribution_events` (**Immutable Audit Log**)
   - Append-only event store. Rows are **never updated or deleted**.
   - Fields: `id`, `candidate_id`, `organizer_id`, `operation_type` (`FIFO`, `MANUAL`, `UNDO`, `RETURN`, `CANCEL`, `RESTORE`, `REASSIGN`, `COMPLETE`), `previous_state`, `new_state`, `previous_filiere`, `new_filiere`, `previous_queue_position`, `new_queue_position`, `undo_of` (self-referential FK to previous event), `reason`, `regulator`, `room`, `created_at`.

7. `push_subscriptions`
   - Web Push endpoints stored per candidate.
   - Fields: `id`, `candidate_id` (FK -> `candidates.id`), `endpoint` (unique text), `p256dh`, `auth`, `expiration_time`.

8. `notification_events` & `notification_deliveries`
   - `notification_events`: Scheduled push events. Includes `deduplication_key` (unique within window), `event_type` (`ATTRIBUTED`, `IMMEDIATE`, `URGENT`, `APPROACHING`, `REVERSED`, `RETURNED`, `CANCELLED`), `payload` (JSON text), `status`.
   - `notification_deliveries`: Tracks individual delivery attempts per subscription (`attempt_count`, `status`: `PENDING` | `SENT` | `FAILED` | `INVALID`, `last_error`).

9. `activity_logs`
   - System-wide append-only activity trail.
   - Fields: `id`, `actor_type` (`candidate` | `organizer` | `system`), `actor_id`, `action` (e.g. `candidate.login`, `organizer.attribute_fifo`, `candidate.confirm_contact`), `details` (JSON payload), `created_at`.
   - Also mirrored to disk at `backend/logs/activity.log`.

---

## 6. The Queue System & Attribution Engine

### Dynamic Position Calculation
Queue position is **never written as a static number** in the database. Writing static ranks causes catastrophic database locks when inserting, deleting, or reordering candidates.

Instead, position is calculated deterministically at read time:
```sql
SELECT COUNT(*) + 1
FROM queue_entries
WHERE filiere_code = :filiere_code
  AND status = 'WAITING'
  AND (
    joined_at < :target_joined_at
    OR (joined_at = :target_joined_at AND id < :target_id)
  );
```
For organizer queue summaries, a single query with a `ROW_NUMBER() OVER (PARTITION BY filiere_code ORDER BY joined_at, id)` window function computes ranks for all candidates simultaneously.

### Concurrency & The FIFO Invariant
When an organizer clicks **"Attribuer le suivant"** (FIFO attribution):
1. Begins an async transaction.
2. Executes:
   ```sql
   SELECT * FROM queue_entries
   WHERE filiere_code = :filiere_code AND status = 'WAITING'
   ORDER BY joined_at ASC, id ASC
   LIMIT 1
   FOR UPDATE SKIP LOCKED;
   ```
3. `SKIP LOCKED` guarantees that if two organizers click simultaneously for the same or different filières, neither will ever block or attribute the same candidate twice.
4. Updates candidate's entry: `status = 'ATTRIBUTED'`, records `regulator`, `room`, `attributed_at = func.now()`.
5. Inserts an audit row into `attribution_events`.
6. Schedules an `ATTRIBUTED` notification event for this candidate.
7. Queries the next 5 waiting candidates in that filière and schedules threshold events (`IMMEDIATE` for pos 1, `URGENT` for pos 2, `APPROACHING` for pos 3-5).
8. Commits transaction.
9. **After Commit**: Fires WebSocket broadcasts and enqueues background ARQ tasks to Redis.

### Reversibility (Undo & Restorations)
Every action can be undone:
- **`undo_last(organizer_id)`**: Finds the most recent attribution event performed by this organizer and reverses it.
- **`undo_attribution(candidate_id)`**: Sets candidate back to `WAITING`. To prevent queue jumping, the undone candidate rejoins **at the bottom** of the queue (`joined_at` reset to `func.now()`).
- **`candidate_arrived(candidate_id)`**: Acknowledges that the summoned student arrived at the interview room, marking the queue entry `COMPLETED`.

---

## 7. Authentication, Sessions & Security Model

FAME maintains two completely separated authentication frontiers:

### 1. Student / Candidate Frontier
- Students never submit credentials directly to the FAME backend.
- The React PWA sends credentials to the isolated **Cloudflare Worker** (`POST {WORKER}/auth`).
- Worker uses the vendored `schoolapp.js` client to log into `https://schoolapp.ensam-umi.ac.ma`, pulls the student's personal details, year, and filière.
- Worker signs an Ed25519 JWT assertion containing:
  - `iss: "fame-schoolapp"`, `aud: "fame-api"`, `sub: ensam_code`, `exp: now + 300`
  - Signed using `SCHOOLAPP_PRIVATE_KEY` (stored strictly in Cloudflare Worker secrets).
- React frontend forwards this assertion token to `POST /api/v1/auth/schoolapp`.
- Backend verifies the signature with `SCHOOLAPP_PUBLIC_KEY` (Ed25519), validates claims, upserts the candidate record, and issues:
  - An HTTP-Only cookie `fame_session` containing a symmetric HS256 JWT signed with `SESSION_SECRET`.
  - A CSRF token returned in the response body.

### 2. Organizer Frontier
- Organizers log in at `POST /api/v1/organizer/auth/login`.
- Credentials checked against `organizers.password_hash` using **Argon2id**.
- On success:
  - Generates a 32-byte secure random session token.
  - Generates a 32-byte secure random CSRF token.
  - Stores `token_hash` (SHA-256) in `organizer_sessions`.
  - Sets HTTP-Only cookie `fame_organizer_session` (`SameSite=Strict`, `Secure` in production, 12h expiry).
  - Returns CSRF token in response payload.

### Defense-in-Depth Security Rules
- **Cookie Security**: All auth cookies are `HttpOnly` and cannot be read by JavaScript.
- **CSRF Protection**: All state-modifying requests (`POST`, `PUT`, `DELETE`) require the `X-CSRF-Token` header.
- **Strict Role Separation**:
  - Candidates cannot read other candidates' data, full queue listings, or statistics.
  - Organizers cannot view or access candidate passwords.
- **Rate Limiting**: Redis-backed fixed-window rate limiting on login routes (10 attempts / 5 minutes per username) and IP-based rate limiting (120 req / minute).
- **HTTP Security Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.

---

## 8. Notification Architecture & Web Push (VAPID)

Candidates can lock their phones or leave the browser. FAME guarantees delivery via standard **W3C Web Push**:

```
[Attribution Event Committed]
           │
           ▼
[schedule_threshold_notifications] ─── (PostgreSQL transaction commit)
           │
           ▼
[ARQ Redis Queue: deliver_notification(event_id)]
           │
     ┌─────┴────────────────────────┐
     ▼                              ▼
[pywebpush / VAPID]         [Multi-Channel Fallbacks]
     │                              ├─ WhatsApp Web Bridge (HTTP POST :3000)
     ▼                              └─ Email Dispatch (FormSubmit)
[Browser Push Service]
(FCM / Mozilla / Apple)
     │
     ▼
[Device Service Worker: sw.js]
     │
     ▼
[Native System Notification Banner]
```

### Reliability Guarantees
- **Post-Commit Guarantee**: Notifications are **never** scheduled or dispatched until the database transaction is committed to PostgreSQL.
- **Deduplication Key**: Each notification event has a deterministic key (e.g. `candidate:142:APPROACHING:2026111001`). Redis and Postgres constraints prevent duplicate messages if triggers fire closely.
- **TTL Configuration**: `PUSH_TTL_SECONDS=300` ensures that mobile devices in battery Doze mode receive the queued push when waking up.
- **Auto-Cleanup**: If Web Push service returns `404` or `410 Gone`, the subscription is immediately marked `INVALID` and pruned.

---

## 9. Frontend Architecture (`fame-react`)

The frontend is a zero-dependency (other than React and TypeScript) high-performance SPA and installable PWA.

### Hash-Based Routing
To prevent complex Nginx rewrite edge cases and ensure offline PWA resiliency, the app uses hash routing:
- `#/login` — Split login tab for students (SchoolApp) and organizers.
- `#/confirm` — Contact verification screen (forces student to verify email and WhatsApp phone number before proceeding).
- `#/student` — Real-time student queue ticket:
  - Displays dynamic rank, status badge, estimated wait time, assigned regulator & room.
  - One-click PWA installation button.
  - "Activer les notifications" Web Push prompt button.
  - "Quitter la file" (voluntary withdrawal).
- `#/organizer` — Dispatcher board:
  - Queue summary cards with live waiting counts per filière.
  - Quick FIFO attribution buttons ("Attribuer le suivant").
  - Live Summon countdown widget (showing assigned regulator/room, elapsed time, "Arrivé" and "Relancer" actions).
  - Search candidates by name, ENSAM code, or filière for manual attribution.
  - Reversibility control: "Annuler la dernière attribution".
- `#/public` — Large-screen display for hall projectors/monitors:
  - High-contrast board showing active summons with flashing indicator.
  - Approaching candidates grid.
  - Live clock and institutional ticker.

### Real-Time Sync: WebSockets with Auto-Reconnect
- Connected via `connectWebSocket(path, onMessage)` in `fame-react/src/ws.ts`.
- Automatically reconnects with exponential backoff if connection drops.
- When an attribution event occurs, the server broadcasts an event frame, prompting clients to re-fetch their state.

---

## 10. External Integrations & Bridges

### 1. Cloudflare Worker (`schoolapp.js`)
- Authenticates with upstream `https://schoolapp.ensam-umi.ac.ma`.
- Uses vendored library in `vendor/schoolapp/`.
- Key scripts:
  - Deploy worker: `npx wrangler deploy`
  - Set secret: `npx wrangler secret put SCHOOLAPP_PRIVATE_KEY`

### 2. WhatsApp Web Bridge (`bridge/`)
- Located in `bridge/bridge.js`.
- Express microservice wrapping `whatsapp-web.js` with Puppeteer.
- Displays terminal or browser QR code at `http://localhost:3000/qr` to link a physical WhatsApp account.
- Backend calls `POST /send` with `{ number, message }` to notify students directly on WhatsApp when summoned.

---

## 11. Configuration & Environment Variables

| Variable | Default / Example | Description |
|---|---|---|
| `ENVIRONMENT` | `development` | Set to `production` in production (enables Secure cookies, enforces migrations). |
| `DATABASE_URL` | `postgresql+asyncpg://fame:fame@localhost:5432/fame` | Async PostgreSQL connection string. |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection for ARQ jobs and rate limiting. |
| `SCHOOLAPP_WORKER_URL` | `https://schoolapp-worker.example.workers.dev` | Public URL of the deployed Cloudflare Worker. |
| `SCHOOLAPP_PUBLIC_KEY` | *(Base64url Ed25519)* | Public key used by FastAPI to verify student login assertions. |
| `SESSION_SECRET` | *(32+ char secret)* | Secret key used to sign candidate session JWTs. |
| `ALLOWED_ORIGINS` | `http://localhost:5483,http://localhost:5173` | Comma-separated allowed CORS origins. |
| `VAPID_PUBLIC_KEY` | *(Base64url P-256)* | Public key for browser Push API registration. |
| `VAPID_PRIVATE_KEY` | *(Base64url P-256)* | Private key for backend Web Push signing. |
| `VAPID_SUBJECT` | `mailto:admin@fame.local` | Contact email included in Web Push VAPID claims. |
| `REGULATORS` | `Regulateur 1,Regulateur 2` | Comma-separated list of organizer/regulator names. |
| `ROOMS` | `Salle 1,Salle 2` | Comma-separated list of physical interview rooms (paired 1-to-1 with regulators by index). |
| `WHATSAPP_BRIDGE_URL` | `http://host.docker.internal:3000` | URL of the local WhatsApp Web bridge service. |
| `WHATSAPP_NOTIFICATIONS_ENABLED` | `true` | Toggle WhatsApp notifications. |
| `EMAIL_NOTIFICATIONS_ENABLED` | `true` | Toggle FormSubmit email notifications. |
| `NOTIFICATION_EMAIL` | `fame@gadzarts.xyz` | Destination address for email notifications. |
| `ORGANIZER_INITIAL_EMAILS` | `admin:admin@ensam-umi.ac.ma` | Bootstrap organizer accounts created on first startup. |
| `PORT` | `5483` | Host port mapped to Nginx reverse proxy in Docker Compose. |

---

## 12. Local Development & Operational Workflows

### Prerequisites
- Python 3.12+ with `uv`
- Node.js 20+ with `npm`
- Docker and Docker Compose
- PostgreSQL 16 & Redis 7 (or run via Docker)

### Step-by-Step Developer Setup

1. **Clone & Configure Environment**:
   ```bash
   cp .env.example .env
   # Generate cryptographic keys
   cd backend && uv run python ../scripts/generate_keys.py
   # Paste the generated keys into .env and Cloudflare Worker
   ```

2. **Run Backend Locally**:
   ```bash
   cd backend
   uv sync --extra dev
   uv run alembic upgrade head
   uv run uvicorn app.main:app --reload --port 8000
   ```

3. **Run ARQ Worker Locally**:
   ```bash
   cd backend
   uv run arq app.workers.notifications.WorkerSettings
   ```

4. **Run Frontend Dev Server**:
   ```bash
   cd fame-react
   npm install
   npm run dev    # Starts Vite on :5173, proxied to backend :8000
   ```

5. **Run Full Docker Stack**:
   ```bash
   make up        # Equivalent to docker compose up -d --build
   make logs      # Follow stack logs
   make down      # Stop stack
   ```

6. **Create an Organizer Account**:
   ```bash
   cd backend && uv run python ../scripts/create_organizer.py --username admin --email admin@example.com
   ```

---

## 13. Testing Strategy & Quality Assurance

FAME has a comprehensive, deterministic test suite designed to run against **real PostgreSQL instances** (never SQLite, ensuring real locking semantics).

```bash
# Run backend pytest suite (27+ tests covering concurrency, FIFO, auth, etc.)
cd backend && uv run pytest

# Check code formatting & linting
cd backend && uv run ruff check .

# Typecheck frontend code
cd fame-react && npm run typecheck

# Build frontend production bundle
cd fame-react && npm run build
```

### Critical Tests in `backend/tests/`
- `test_concurrent_fifo_no_double_attribution`: Spawns 10 parallel asynchronous workers attempting to attribute from the same queue simultaneously; verifies zero duplicate attributions.
- `test_undo_attribution_moves_to_bottom`: Verifies that an undone attribution places the candidate at the tail of the queue, preventing queue-jumping attacks.
- `test_security.py`: Verifies Ed25519 token validation, expiration rejection, signature tampering detection, and Argon2id password hashing.
- `test_notifications.py`: Verifies notification threshold triggers and deduplication keys.

---

## 14. Rules & Guidelines for Future Coding Agents

When working on this codebase, adhere strictly to the following engineering rules:

1. **Never Persist Queue Positions**: Never add a `position` column to `queue_entries`. Positions must always be computed dynamically from `(joined_at, id)` to prevent locking cascades and race conditions.
2. **Never Bypass Row-Level Locking on Attributions**: Any endpoint that attributes a candidate must use `SELECT ... FOR UPDATE SKIP LOCKED` inside a transaction.
3. **Audit Log Immutability**: Never execute `UPDATE` or `DELETE` queries on `attribution_events` or `activity_logs`. All reversals must append a new event referencing the prior operation via `undo_of`.
4. **Post-Commit Side Effects Only**: Never trigger WebSockets, push notifications, or external HTTP webhooks inside an uncommitted database transaction. Always use `_post_commit_effects` or ARQ background jobs after `await session.commit()`.
5. **Preserve Filière Resolution**: When accepting filière codes from students, always route through `resolve_filiere()` in `app.services.filiere` to normalize strings to the 37 canonical ENSAM codes.
6. **Double-Submit CSRF Enforcement**: Every new POST/PUT/DELETE route must include the `candidate_csrf` or `organizer_csrf` dependency.
7. **Keep Candidate Privacy**: Never expose candidate phone numbers, emails, or personal student codes to unauthenticated endpoints or to other students. The public display (`/public/display`) only displays candidate names and filière abbreviations.
8. **Keep Dependencies Locked**: When adding dependencies, use `uv add` for Python and update `backend/uv.lock`; use `npm install` for frontend and commit `fame-react/package-lock.json`.
