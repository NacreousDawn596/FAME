# Architecture

FAME is a single-company recruitment queue and candidate attribution platform for
ENSAM Meknès. It has exactly **one company**, **one or more organizers**, and
**many candidates** who authenticate through ENSAM's SchoolApp.

## System overview

```
                         ┌────────────────────────────┐
                         │  SchoolApp Cloudflare       │
                         │  Worker (schoolapp.js)       │
                         │  • authenticates student     │
                         │  • signs Ed25519 assertion   │
                         └──────────────┬─────────────┘
                                        │ signed JWT assertion
                                        ▼
   ┌──────────────────┐      ┌──────────────────────────────┐
   │  React PWA        │ HTTP │  FastAPI backend (api)        │
   │  (candidate UI)   ├─────►│  • verifies assertion          │
   │  (organizer UI)   │  WS  │  • queue + attribution         │
   └──────────────────┘      │  • WebSocket sync              │
                             └──────┬───────────┬─────────────┘
                                    │           │
                          ┌─────────▼──┐   ┌────▼──────────┐
                          │ PostgreSQL │   │ Redis          │
                          │ (state)    │   │ (ARQ jobs)     │
                          └────────────┘   └────┬───────────┘
                                                │ enqueue
                                          ┌─────▼──────────┐
                                          │ ARQ worker      │
                                          │ • Web Push via  │
                                          │   VAPID         │
                                          └─────────────────┘
```

## Components

| Service    | Role                                                       |
| ---------- | ---------------------------------------------------------- |
| `postgres` | Authoritative state (candidates, queue, attribution log).  |
| `redis`    | ARQ job queue + rate limiting.                             |
| `api`      | FastAPI REST + WebSocket endpoints.                        |
| `worker`   | ARQ worker delivering Web Push notifications.              |
| `frontend` | Nginx serving the compiled React PWA.                      |
| `nginx`    | (optional) reverse proxy fronting frontend + api.          |

## Core invariants

1. A candidate is identified **only** by `ensam_code`. Names are display-only.
2. One queue entry per candidate (`queue_entries.candidate_id` is unique).
3. Queue position is **never persisted** — it is derived from `joined_at` and `id`.
4. Attribution is **reversible** and every operation is recorded in an immutable
   `attribution_events` audit log.
5. Notifications are **never** emitted for a state that isn't committed to
   PostgreSQL (side effects run after the transaction commits).

## Request flow (candidate)

1. Candidate opens the PWA and signs in with SchoolApp credentials.
2. The frontend calls the Cloudflare Worker, which authenticates and returns a
   short-lived Ed25519-signed JWT (`sub` = `ensamCode`).
3. The frontend posts that assertion to `POST /api/v1/auth/schoolapp`.
4. The backend verifies `iss`, `aud`, `exp`, `iat`, signature, and `sub`.
5. The backend upserts the candidate and creates a `WAITING` queue entry.
6. The backend issues a session cookie (JWT) and returns the CSRF token.
7. The candidate's queue view subscribes to a WebSocket and receives live updates.
