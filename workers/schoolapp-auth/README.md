# FAME SchoolApp Authentication Worker

Cloudflare Worker that verifies a student's **SchoolApp** (ENSAM/UMI) credentials
and emits a short-lived, Ed25519-signed identity assertion consumed by the FAME
Spring Boot API. It is deliberately **narrowly scoped** — it is an authentication
bridge, **not** a general-purpose HTTP proxy.

- **Public URL**: `https://schoolapp-auth.gadzarts.xyz`
- **Runtime**: Cloudflare Workers (Wrangler)
- **Upstream (pinned)**: `https://schoolapp.ensam-umi.ac.ma`

---

## Why it exists

FAME students authenticate through their institutional SchoolApp account. The
worker is the only component that talks to SchoolApp. It:

1. Authenticates credentials against the fixed SchoolApp origin.
2. Reads the minimal profile fields needed to derive identity.
3. Signs a short-lived assertion (`iss`/`aud`/`sub`/`email`/`name` + the
   server-issued `challenge`/`nonce`) with an Ed25519 key that lives **only** in
   Cloudflare Worker secrets.
4. Discards all transient state (cookies, credentials) immediately.

The FAME backend verifies the assertion signature and trusts only its own
whitelist/domain checks — the browser never receives the signing key.

---

## Architecture

```
React (student) ──creds──▶ Worker /login ──login+profile──▶ SchoolApp
       ▲                         │
       └──── assertion ──────────┘ ──POST /auth/*/assert──▶ FAME API (verifies)
```

```
workers/schoolapp-auth/
├── src/
│   ├── index.js      # fetch handler + /login + /public-key
│   └── jwt.js        # Ed25519 JWT signer (pure JS)
├── vendor/           # pinned, patched schoolapp.js (v2.5.3 @ d89de2a)
│   ├── index.js
│   └── src/          # SchoolAppClient, AuthManager, HTTPClient, managers, parsers, types
├── test/worker.test.js
├── wrangler.toml
└── package.json
```

---

## HTTP methods

### `GET /public-key`

Returns the Ed25519 public key derived from the `SIGNING_PRIVATE_KEY` secret.
The FAME API is configured with this value (`fame.worker.public-key`).

**200**
```json
{ "publicKey": "base64url-encoded-32-bytes" }
```
**500** — `SIGNING_PRIVATE_KEY` not set: `{ "error": "NOT_CONFIGURED" }`

### `POST /login`

Verifies SchoolApp credentials and returns a signed identity assertion.

**Request** (`application/json`, ≤ 8 KB):
```json
{
  "email": "student@ensam-umi.ac.ma",
  "password": "…",
  "challenge": "server-issued-challenge",
  "nonce": "server-issued-nonce"
}
```

**200** on success:
```json
{ "assertion": "<header>.<payload>.<signature>" }
```

The assertion is a JWT (`EdDSA`/Ed25519) with claims:

| Claim | Meaning |
|-------|---------|
| `iss` | `env.ISSUER` (default `https://schoolapp-auth.gadzarts.xyz`) |
| `aud` | `fame-api` |
| `sub` | normalized student code (`CNE/Masar`) |
| `email` | the **login** email used to authenticate (not the profile's stored email) |
| `name` | full name |
| `niveau` | academic level (e.g. `5A`) |
| `filiere` | academic program (`administrative_info.Filière`) |
| `challenge`, `nonce` | the FAME-issued single-use challenge binding |
| `iat`, `nbf`, `exp` | issued/valid-from/expiry (TTL 90 s) |

**Error responses**

| Status | `error` | Meaning |
|--------|---------|---------|
| 400 | `INVALID_JSON` | Body is not valid JSON |
| 400 | `MISSING_FIELDS` | `email`/`password`/`challenge`/`nonce` missing |
| 401 | `INVALID_CREDENTIALS` | SchoolApp login failed (generic) |
| 413 | `PAYLOAD_TOO_LARGE` | Body > 8 KB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Not `application/json` |
| 500 | `NOT_CONFIGURED` | `SIGNING_PRIVATE_KEY` missing |
| 500 | `UPSTREAM_NOT_ALLOWED` | `SCHOOLAPP_BASE_URL` outside allowlist |
| 502 | `UPSTREAM_UNAVAILABLE` | Upstream request error/timeout |
| 502 | `IDENTITY_UNAVAILABLE` | Profile did not yield a student code |

### `OPTIONS *`

CORS preflight → **204** with allowlisted `Access-Control-*` headers.

### Everything else → **404** `{ "error": "NOT_FOUND" }`

---

## Configuration

### Secrets (via `npx wrangler secret put`)

| Secret | Description |
|--------|-------------|
| `SIGNING_PRIVATE_KEY` | base64url-encoded Ed25519 32-byte seed. The **only** secret. |

Generate the keypair:

```bash
openssl genpkey -algorithm ed25519 -out key.pem
# encode the 32-byte seed (private) as base64url
```

### Variables (`wrangler.toml` → `[vars]`)

| Var | Default | Description |
|-----|---------|-------------|
| `ISSUER` | `https://schoolapp-auth.gadzarts.xyz` | `iss` claim; must match backend `fame.worker.issuer` |
| `SCHOOLAPP_BASE_URL` | `https://schoolapp.ensam-umi.ac.ma` | Pinned upstream origin (allowlist only) |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated CORS allowlist |

---

## Deployment

```bash
cd workers/schoolapp-auth
npm install
npx wrangler secret put SIGNING_PRIVATE_KEY
npx wrangler deploy
```

- Configure the custom domain `schoolapp-auth.gadzarts.xyz` in the Cloudflare
  dashboard (Workers → Triggers → Custom Domains), or via a route.
- Read the public key: `curl https://schoolapp-auth.gadzarts.xyz/public-key`.
- Configure the FAME backend accordingly: set `fame.worker.public-key` (that
  key), `fame.worker.issuer` (`https://schoolapp-auth.gadzarts.xyz`) and
  `fame.worker.audience` (`fame-api`) in `config.yml`.

Local development:

```bash
npm run dev        # wrangler dev (http://localhost:8787)
npm test           # vitest (upstream mocked)
```

---

## Security model

- **No open proxy** — requests go only to the allowlisted `SCHOOLAPP_BASE_URL`.
- **Isolated sessions** — a fresh `SchoolAppClient` + cookie jar per attempt;
  state is discarded (`resetSession()`) immediately after login/profile.
- **Redirect pinning** — the vendored HTTP client aborts on redirects outside
  the configured origin (SSRF/open-redirect guard).
- **Sanitized logging** — CSRF tokens and upstream HTML are never logged
  (patched in the vendored `auth.js`).
- **No credential persistence** — passwords are never stored, logged, or
  returned; only the signed assertion leaves the worker.
- **No arbitrary host/URL** — `SCHOOLAPP_BASE_URL` must be in the allowlist.

---

## The vendored `schoolapp.js` library

Pinned to `schoolapp.js` **v2.5.3** (commit `d89de2a`), patched for Worker
compatibility and safety (see `vendor/`): CommonJS conversion (`auth.js`,
`managers/index.js`), removal of CSRF/content-dump logging, and origin-pinned
redirects.

### `SchoolAppClient` — main client

```js
const client = new SchoolAppClient(baseUrl?);
```

| Method | Returns |
|--------|---------|
| `login(email, password)` | `Promise<boolean>` |
| `logout()` | `Promise<void>` |
| `resetSession()` | `Promise<void>` (clears cookie jar) |
| `getProfile()` | `Promise<Object\|null>` |
| `getFilieres()` | `Promise<Array\|null>` (academic programs) |
| `getAbsences()` | `Promise<Object\|null>` |
| `getSanctions()` | `Promise<Object\|null>` |
| `getElemNote()` / `getCurrentElemNote()` | `Promise<Array>` (element grades) |
| `getModNote()` / `getCurrentModNote()` | `Promise<Array>` (module grades) |
| `getAnnee()` / `getSemestre()` | `Promise<Array>` |
| `getModules(niveau, filiere, semestre, refreshCsrf?)` | `Promise<Object\|null>` |
| `getPhoto(code)` | profile photo |

Sub-managers: `client.grades`, `client.attendance`, `client.profile`,
`client.courses`, and `client.auth`.

### `AuthManager` (via `client.auth`)

`login(email, password)`, `logout()`, `checkSession()`, `confirmSessionLoss()`,
`refreshCsrfFromUrl(url)`, `isLoggedIn()`, `isAuthSuspect()`,
`setLoginState(state)`, `resetAuthState()`, `updateCsrfToken(html)`,
static `extractCsrfToken(html)`.

### `HTTPClient`

`new HTTPClient(baseUrl)`, `get(url, params?)`, `post(url, data, referer?)`,
`setUnauthorizedHandler(handler)`, `resetSession()`, and
`setNetworkChecker(fn)` (React Native connectivity hook). Uses a per-instance
in-memory `CookieJar` with domain/path/secure/expiry handling.

### Managers

- `GradesManager` — `getElementNotes(current?)`, `getModuleNotes(current?)`,
  `getYears()`, `getSemesters()`.
- `AttendanceManager` — `getAbsences()`, `getSanctions()`.
- `ProfileManager` — `getProfile()`, `getFilieres()`, `getPhoto(code)`.
- `CourseManager` — `getModules(niveau, filiere, semestre, refreshCsrf?)`.

### Parsers / types

`vendor/src/parsers/` map raw SchoolApp HTML into structured objects (profile,
grades, absences, filieres, modules, sanctions, stats). `vendor/src/types/`
defines `Element`, `Module`, `Annee`, `Semestre` (with `.stats()` helpers).

---

## `src/jwt.js` — signing helpers

| Function | Description |
|----------|-------------|
| `derivePublicKey(privateKeyB64)` | Derive + return the base64url public key |
| `signAssertion(privateKeyB64, claims)` | Sign claims → `h.p.sig` JWT string |
| `bytesToBase64url(bytes)` / `base64urlToBytes(str)` | base64url codec |

Uses [`@noble/ed25519`](https://github.com/paulmillr/noble-ed25519) (pure JS,
audited, no native deps) — identical behavior in Workers and Node.

---

## Testing

```bash
npm test
```

`test/worker.test.js` covers, with a **mocked** upstream `fetch`:

- valid credentials → verifiable Ed25519 assertion with correct claims;
- invalid credentials → `401 INVALID_CREDENTIALS`;
- missing fields → `400`;
- `GET /public-key` → derived public key;
- missing signing key → `500 NOT_CONFIGURED`;
- oversized payload → `413`.

> No test ever contacts the real SchoolApp service — only mocks.
