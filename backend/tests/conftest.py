"""Pytest fixtures. Uses a dedicated PostgreSQL test database."""

from __future__ import annotations

import os

os.environ["DATABASE_URL"] = "postgresql+asyncpg://fame:fame@localhost:55432/fame_test"
os.environ["REDIS_URL"] = "redis://localhost:56379/1"
os.environ["SESSION_SECRET"] = "test-secret-that-is-at-least-32-bytes-long-1234567890"
os.environ["SCHOOLAPP_PUBLIC_KEY"] = ""
os.environ["ENVIRONMENT"] = "test"

import base64  # noqa: E402

import pytest  # noqa: E402
from cryptography.hazmat.primitives import serialization  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import ed25519  # noqa: E402

from app.database import Base, SessionFactory  # noqa: E402
from app.seed.filieres import FILIERES  # noqa: E402


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
async def _clean_db():
    """Recreate schema and seed filières before each test."""
    from app.database import engine

    # Drop all pooled connections so stale transactions can't block DDL.
    await engine.dispose()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    from app.models import Filiere

    async with SessionFactory() as session:
        for f in FILIERES:
            session.add(
                Filiere(
                    code=f["code"],
                    intitule=f["intitule"],
                    departement=f["departement"],
                    accreditation=f["accreditation"],
                )
            )
        await session.commit()
    yield


@pytest.fixture
def schoolapp_keypair():
    key = ed25519.Ed25519PrivateKey.generate()
    private = key.private_bytes(
        serialization.Encoding.Raw,
        serialization.PrivateFormat.Raw,
        serialization.NoEncryption(),
    )
    public = key.public_key().public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw
    )
    return {
        "private_b64": base64.urlsafe_b64encode(private).decode().rstrip("="),
        "public_b64": base64.urlsafe_b64encode(public).decode().rstrip("="),
        "private": key,
    }


@pytest.fixture
def schoolapp_assertion_factory(schoolapp_keypair):
    """Return a function that builds a signed SchoolApp assertion JWT."""
    import json
    import time

    def make(ensam_code="E123", name="Ali", last_name="Ben", year="3A", filiere="GI-ILSI", **overrides):
        now = int(time.time())
        payload = {
            "sub": ensam_code,
            "name": name,
            "lastName": last_name,
            "year": year,
            "filiere": filiere,
            "iss": "fame-schoolapp",
            "aud": "fame-api",
            "iat": now,
            "exp": now + 300,
        }
        payload.update(overrides)

        def b64url(b: bytes) -> str:
            return base64.urlsafe_b64encode(b).decode().rstrip("=")

        header = b64url(json.dumps({"alg": "EdDSA", "typ": "JWT"}).encode())
        payload_b64 = b64url(json.dumps(payload).encode())
        signing_input = f"{header}.{payload_b64}".encode()
        signature = schoolapp_keypair["private"].sign(signing_input)
        return f"{header}.{payload_b64}.{b64url(signature)}"

    return make
