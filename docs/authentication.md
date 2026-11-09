# Authentication

FAME has two independent authentication systems.

## 1. Candidate authentication (SchoolApp)

Candidates authenticate against ENSAM's SchoolApp. FAME **does not** implement a
second SchoolApp client: it reuses the existing Cloudflare Worker (`schoolapp.js`)
which performs the SchoolApp authentication and returns a signed identity
assertion.

### Flow

1. Frontend collects SchoolApp username/password.
2. Frontend calls `POST {WORKER}/auth`.
3. The Worker authenticates via the vendored [`schoolapp.js`](https://github.com/NacreousDawn596/schoolapp.js)
   client (`vendor/schoolapp/`), which talks to `https://schoolapp.ensam-umi.ac.ma`.
   It logs in, fetches the profile, and normalizes the identity:
   - `ensamCode` ← profile `personal_info.Code` (fallback `administrative_info.Code`, then `CNE/Masar`)
   - `name` ← `personal_info.Prénom`
   - `lastName` ← `personal_info.Nom`
   - `year` ← `academic_info["Niveau Accès"]` (fallback `Annee Accès`)
   - `filiere` ← the current academic-year result's `Filiere` (`getAnnee()`)
4. The Worker signs a short-lived (5 min) Ed25519 JWT:
   `sub` = `ensamCode`, `name`, `lastName`, `year`, `filiere`, `iss`, `aud`,
   `iat`, `exp`.
5. The frontend posts the assertion to `POST /api/v1/auth/schoolapp`.
6. The backend verifies signature (Ed25519 public key), issuer, audience,
   expiration, age, and subject.
7. The backend upserts the candidate and issues an `httpOnly` session cookie.

### Key management

- The Worker holds the Ed25519 **private** key as a Cloudflare secret
  (`SCHOOLAPP_PRIVATE_KEY`, base64url PKCS#8 DER). It never reaches the
  browser or the backend.
- The backend holds only the **public** key (`SCHOOLAPP_PUBLIC_KEY`).
- Generate both with `python scripts/generate_keys.py`.

### Verification (backend)

`app/security/tokens.py::verify_schoolapp_assertion` reconstructs the signing
input, verifies the Ed25519 signature with `cryptography`, then validates the
standard JWT claims. The frontend is never trusted to supply identity directly.

## 2. Organizer authentication

Organizers use a dedicated username/password login, fully separate from
SchoolApp.

- Passwords hashed with **Argon2id** (`app/security/passwords.py`).
- Login creates an opaque token stored hashed in `organizer_sessions`, returned
  in an `httpOnly` `SameSite=Strict` cookie.
- Sessions expire after 12 hours.
- Every organizer session carries a CSRF token; state-changing requests must
  send it in `X-CSRF-Token`.
- Login is rate-limited (10 attempts / 5 min per username).
- Accounts are bootstrapped from `ORGANIZER_INITIAL_EMAILS` (comma-separated)
  or via `python scripts/create_organizer.py`.

## CSRF

Candidate and organizer state-changing endpoints require an `X-CSRF-Token`
header matching the token embedded in the session. Combined with `httpOnly` +
`SameSite` cookies, this prevents cross-site request forgery.
