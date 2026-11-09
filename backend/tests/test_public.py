"""Tests for the public call display endpoint."""

from app.database import SessionFactory
from app.models import Organizer
from app.security.passwords import hash_password


async def test_public_display(client, schoolapp_assertion_factory, schoolapp_keypair, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "schoolapp_public_key", schoolapp_keypair["public_b64"])

    async with SessionFactory() as s:
        s.add(Organizer(username="admin", email="a@b.c", password_hash=hash_password("secret123")))
        await s.commit()

    # Register two candidates in two filieres.
    r = await client.post("/api/v1/auth/schoolapp", json={"assertion": schoolapp_assertion_factory("E1", name="Ali", last_name="Ben", filiere="GI-ILSI")})
    assert r.status_code == 200
    r = await client.post("/api/v1/auth/schoolapp", json={"assertion": schoolapp_assertion_factory("E2", name="C", last_name="D", filiere="GC")})
    assert r.status_code == 200

    # Public display shows both on deck and no calls yet.
    r = await client.get("/api/v1/public/display")
    assert r.status_code == 200
    body = r.json()
    assert body["calls"] == []
    names = {n["candidate_name"] for n in body["next"]}
    assert names == {"Ali Ben", "C D"}


async def test_public_display_shows_calls(client, schoolapp_assertion_factory, schoolapp_keypair, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "schoolapp_public_key", schoolapp_keypair["public_b64"])

    async with SessionFactory() as s:
        s.add(Organizer(username="admin", email="a@b.c", password_hash=hash_password("secret123")))
        await s.commit()

    await client.post("/api/v1/auth/schoolapp", json={"assertion": schoolapp_assertion_factory("E1", name="Ali", last_name="Ben", filiere="GI-ILSI")})
    await client.post("/api/v1/auth/schoolapp", json={"assertion": schoolapp_assertion_factory("E2", name="C", last_name="D", filiere="GC")})

    login = await client.post("/api/v1/organizer/auth/login", json={"username": "admin", "password": "secret123"})
    csrf = login.json()["csrf"]
    org = {"X-CSRF-Token": csrf}

    await client.post("/api/v1/organizer/attributions/fifo", json={"filiere_code": "GI-ILSI"}, cookies=login.cookies, headers=org)

    r = await client.get("/api/v1/public/display")
    body = r.json()
    assert len(body["calls"]) == 1
    assert body["calls"][0]["candidate_name"] == "Ali Ben"
    assert body["calls"][0]["filiere_code"] == "GI-ILSI"
