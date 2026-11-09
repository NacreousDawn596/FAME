"""Tests for SchoolApp assertion verification and token handling."""

import pytest

from app.config import settings
from app.security.tokens import TokenError, verify_schoolapp_assertion


def _set_public_key(monkeypatch, public_b64):
    monkeypatch.setattr(settings, "schoolapp_public_key", public_b64)


def test_valid_assertion(monkeypatch, schoolapp_assertion_factory, schoolapp_keypair):
    _set_public_key(monkeypatch, schoolapp_keypair["public_b64"])
    token = schoolapp_assertion_factory()
    identity = verify_schoolapp_assertion(token)
    assert identity.ensam_code == "E123"
    assert identity.first_name == "Ali"
    assert identity.last_name == "Ben"
    assert identity.filiere == "GI-ILSI"


def test_wrong_key_rejected(monkeypatch, schoolapp_assertion_factory, schoolapp_keypair):
    _set_public_key(monkeypatch, schoolapp_keypair["public_b64"])
    # Tamper with a middle signature character (unambiguously changes bytes).
    token = schoolapp_assertion_factory()
    header, payload, sig = token.split(".")
    mid = len(sig) // 2
    tampered = sig[:mid] + ("A" if sig[mid] != "A" else "B") + sig[mid + 1 :]
    with pytest.raises(TokenError):
        verify_schoolapp_assertion(f"{header}.{payload}.{tampered}")


def test_expired_assertion(monkeypatch, schoolapp_assertion_factory, schoolapp_keypair):
    _set_public_key(monkeypatch, schoolapp_keypair["public_b64"])
    token = schoolapp_assertion_factory(exp=100000)  # long past
    with pytest.raises(TokenError):
        verify_schoolapp_assertion(token)


def test_wrong_issuer(monkeypatch, schoolapp_assertion_factory, schoolapp_keypair):
    _set_public_key(monkeypatch, schoolapp_keypair["public_b64"])
    token = schoolapp_assertion_factory(iss="evil")
    with pytest.raises(TokenError):
        verify_schoolapp_assertion(token)


def test_wrong_audience(monkeypatch, schoolapp_assertion_factory, schoolapp_keypair):
    _set_public_key(monkeypatch, schoolapp_keypair["public_b64"])
    token = schoolapp_assertion_factory(aud="other")
    with pytest.raises(TokenError):
        verify_schoolapp_assertion(token)
