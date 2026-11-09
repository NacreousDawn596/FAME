"""End-to-end HTTP integration test of the full candidate/organizer lifecycle."""

from __future__ import annotations

from app.config import settings
from app.database import SessionFactory
from app.models import Organizer
from app.security.passwords import hash_password


async def _seed_organizer():
    async with SessionFactory() as s:
        org = Organizer(
            username="admin",
            email="admin@fame.local",
            password_hash=hash_password("secret123"),
        )
        s.add(org)
        await s.commit()


async def test_full_lifecycle(client, schoolapp_assertion_factory, schoolapp_keypair, monkeypatch):
    monkeypatch.setattr(settings, "schoolapp_public_key", schoolapp_keypair["public_b64"])
    await _seed_organizer()

    # 1. Candidate authenticates via SchoolApp assertion.
    r = await client.post(
        "/api/v1/auth/schoolapp",
        json={"assertion": schoolapp_assertion_factory("E1", name="Ali", last_name="Ben")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["candidate"]["ensam_code"] == "E1"
    candidate_cookies = r.cookies

    # 2. Candidate sees their queue status (position 1).
    r = await client.get("/api/v1/candidate/queue", cookies=candidate_cookies)
    assert r.status_code == 200
    assert r.json()["position"] == 1
    assert r.json()["status"] == "WAITING"

    # 3. A second candidate joins; the first candidate remains position 1 (FIFO),
    #    the second candidate is position 2.
    r = await client.post(
        "/api/v1/auth/schoolapp",
        json={"assertion": schoolapp_assertion_factory("E2", name="C", last_name="D")},
    )
    assert r.status_code == 200
    second_cookies = r.cookies

    r = await client.get("/api/v1/candidate/queue", cookies=candidate_cookies)
    assert r.json()["position"] == 1
    r = await client.get("/api/v1/candidate/queue", cookies=second_cookies)
    assert r.json()["position"] == 2

    # 4. Organizer logs in.
    r = await client.post(
        "/api/v1/organizer/auth/login", json={"username": "admin", "password": "secret123"}
    )
    assert r.status_code == 200
    org_csrf = r.json()["csrf"]
    org_cookies = r.cookies
    org_headers = {"X-CSRF-Token": org_csrf}

    # 5. Organizer attributes the oldest candidate (E1, joined first).
    r = await client.post(
        "/api/v1/organizer/attributions/fifo",
        json={"filiere_code": "GI-ILSI"},
        cookies=org_cookies,
        headers=org_headers,
    )
    assert r.status_code == 200
    assert r.json()["ensam_code"] == "E1"
    assert r.json()["new_status"] == "ATTRIBUTED"

    # 6. Candidate E1 is now attributed.
    r = await client.get("/api/v1/candidate/queue", cookies=candidate_cookies)
    assert r.json()["status"] == "ATTRIBUTED"

    # 7. Undo the attribution; E1 returns to waiting at front.
    r = await client.post(
        f"/api/v1/organizer/attributions/{body['candidate']['id']}/undo",
        cookies=org_cookies,
        headers=org_headers,
    )
    assert r.status_code == 200

    r = await client.get("/api/v1/candidate/queue", cookies=candidate_cookies)
    assert r.json()["status"] == "WAITING"
    assert r.json()["position"] == 1

    # 8. History contains the operations.
    r = await client.get("/api/v1/organizer/history", cookies=org_cookies)
    assert r.status_code == 200
    ops = [i["operation_type"] for i in r.json()["items"]]
    assert "FIFO" in ops
    assert "UNDO" in ops
