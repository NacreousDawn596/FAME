# Notifications

FAME uses genuine Web Push with VAPID. Candidates can fully close the PWA and
still receive notifications.

## Pipeline

1. A queue mutation (attribution, undo, etc.) commits to PostgreSQL.
2. The API schedules `notification_events` in the same transaction, deduplicated
   by a `deduplication_key` (so the same position/event is never delivered twice).
3. After commit, the API enqueues an ARQ job (`deliver_notification`) on Redis.
4. The ARQ worker loads the event + the candidate's push subscriptions and sends
   Web Push via `pywebpush` (VAPID).
5. Per-subscription `notification_deliveries` record attempt count and status.

## Subscription lifecycle

- The frontend registers a service worker (`public/sw.js`) and subscribes via the
  Push API using the VAPID public key from `/api/v1/config/public`.
- Subscriptions are stored in `push_subscriptions` (multiple per candidate).
- A `404`/`410` from the push service marks the subscription `INVALID` and
  deletes it automatically.
- Transient failures are retried with exponential backoff (ARQ `max_tries = 5`).

## Event types & thresholds

| Event        | Trigger                                          |
| ------------ | ------------------------------------------------ |
| `ATTRIBUTED` | Candidate is attributed.                         |
| `IMMEDIATE`  | Position = 1.                                    |
| `URGENT`     | Position <= `NOTIFICATION_URGENT_THRESHOLD` (2). |
| `APPROACHING`| Position <= `NOTIFICATION_APPROACHING_THRESHOLD` (5). |
| `REVERSED`   | Attribution undone (back to waiting).            |
| `RETURNED`   | Returned to the queue.                           |
| `CANCELLED`  | Candidate cancelled.                             |

Thresholds are configurable via environment variables and exposed publicly via
`/api/v1/config/public`.

## Correctness guarantee

A notification is only created for a state that is already committed. The worker
reads the committed event row; it never fabricates attribution.
