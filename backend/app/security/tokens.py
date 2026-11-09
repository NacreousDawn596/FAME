"""JWT helpers: candidate session tokens + SchoolApp assertion verification.

Candidate sessions are signed with a symmetric session secret (HS256).
SchoolApp identity assertions are signed with an asymmetric Ed25519 key by the
Cloudflare Worker and verified here with the public key.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass

import jwt
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from app.config import settings

CANDIDATE_SESSION_ALG = "HS256"


class TokenError(Exception):
    """Raised for any invalid/expired token."""


@dataclass(frozen=True)
class SchoolAppIdentity:
    ensam_code: str
    first_name: str
    last_name: str
    year: str | None
    filiere: str | None


def _decode_ed25519_token(token: str) -> dict:
    """Decode and verify an Ed25519-signed JWT using the configured public key."""
    try:
        pub = Ed25519PublicKey.from_public_bytes(settings.schoolapp_public_key_bytes)
    except (ValueError, TypeError) as exc:  # pragma: no cover - config error
        raise TokenError("invalid SchoolApp public key configuration") from exc

    try:
        # Reconstruct the signing input ourselves for full control over verification.
        header_b64, payload_b64, signature_b64 = token.split(".")
        signing_input = f"{header_b64}.{payload_b64}".encode()
        signature = _b64url_decode(signature_b64)
        pub.verify(signature, signing_input)
        return json.loads(_b64url_decode(payload_b64))
    except InvalidSignature as exc:
        raise TokenError("assertion signature verification failed") from exc
    except Exception as exc:
        raise TokenError("malformed assertion token") from exc


def _b64url_decode(data: str) -> bytes:
    import base64

    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def verify_schoolapp_assertion(token: str) -> SchoolAppIdentity:
    """Verify a SchoolApp-signed identity assertion and return the identity."""
    now = int(time.time())
    try:
        header = json.loads(_b64url_decode(token.split(".")[0]))
        if header.get("alg", "").upper() != "EDDSA":
            raise TokenError("unsupported assertion algorithm")
    except TokenError:
        raise
    except Exception as exc:
        raise TokenError("malformed assertion header") from exc

    claims = _decode_ed25519_token(token)

    # Validate standard claims.
    if claims.get("iss") != settings.schoolapp_issuer:
        raise TokenError("invalid assertion issuer")
    if claims.get("aud") != settings.schoolapp_audience:
        raise TokenError("invalid assertion audience")
    exp = claims.get("exp")
    if not isinstance(exp, (int, float)) or now > exp:
        raise TokenError("assertion expired")
    iat = claims.get("iat")
    if isinstance(iat, (int, float)) and (now - iat) > settings.schoolapp_assertion_max_age_seconds:
        raise TokenError("assertion too old")

    sub = claims.get("sub")
    if not sub or not isinstance(sub, str):
        raise TokenError("assertion missing subject")

    return SchoolAppIdentity(
        ensam_code=sub.strip(),
        first_name=str(claims.get("name", "")).strip(),
        last_name=str(claims.get("lastName", "")).strip(),
        year=str(claims.get("year", "")).strip() or None,
        filiere=str(claims.get("filiere", "")).strip() or None,
    )


# --- Candidate session tokens -------------------------------------------------


def create_candidate_session(candidate_id: int, ensam_code: str, csrf: str) -> str:
    now = int(time.time())
    payload = {
        "sub": str(candidate_id),
        "ensam": ensam_code,
        "csrf": csrf,
        "iat": now,
        "exp": now + 60 * 60 * 24 * 30,  # 30 days
    }
    return jwt.encode(payload, settings.session_secret, algorithm=CANDIDATE_SESSION_ALG)


def decode_candidate_session(token: str) -> dict:
    try:
        return jwt.decode(token, settings.session_secret, algorithms=[CANDIDATE_SESSION_ALG])
    except jwt.PyJWTError as exc:
        raise TokenError("invalid candidate session") from exc


def create_organizer_token() -> str:
    import secrets

    return secrets.token_urlsafe(32)


def create_csrf_token() -> str:
    import secrets

    return secrets.token_urlsafe(32)
