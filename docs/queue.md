# Queue system

## Data model

- `filieres` — the authoritative filière catalog (seeded from `app/seed/filieres.py`,
  also inserted by the initial Alembic migration). `code` is the canonical id.
- `candidates` — one row per ENSAM student, unique on `ensam_code`.
- `queue_entries` — one row per candidate (`candidate_id` is unique), carrying the
  current `status`, `joined_at`, `attributed_at`, `cancelled_at`, and a `version`.

## Ordering

Each filière has an independent FIFO queue. Ordering is deterministic on
`(joined_at, id)` — the database timestamp plus the auto-increment id as a
tiebreaker. `joined_at` is set by the database (`now()`), so it is
transactionally consistent even under concurrent registration.

Queue position is **computed**, never persisted:

```
position = 1 + count(waiting candidates in the same filière with
                    (joined_at, id) < (candidate.joined_at, candidate.id))
```

The organizer read models use a `ROW_NUMBER()` window function to compute
positions in a single query (no N+1).

## States

`WAITING`, `ATTRIBUTED`, `CANCELLED`, `WITHDRAWN` (internal). Only `WAITING`
candidates occupy a queue position.

## Concurrency

FIFO attribution uses `SELECT ... FOR UPDATE SKIP LOCKED` inside a transaction,
so concurrent organizers cannot attribute the same candidate twice. A
concurrency test (`test_concurrent_fifo_no_double_attribution`) verifies this.

## Reversibility

Undoing an attribution returns the candidate to `WAITING`, but they **rejoin at
the bottom** of their filière queue (`joined_at` is reset to now) rather than at
their original position. Every transition is recorded in `attribution_events`,
and undo operations create their own audit events (history is never erased).

## Notifications

Each time a candidate is attributed, the **5 following** candidates in that
filière are notified (position 1 → `IMMEDIATE`, 2 → `URGENT`, 3–5 →
`APPROACHING`) across Web Push, WhatsApp, and email.
