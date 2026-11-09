"""Unit tests for filière resolution."""

from app.services.filiere import resolve_filiere


def test_exact_code():
    assert resolve_filiere("GI-ILSI") == "GI-ILSI"


def test_case_insensitive_code():
    assert resolve_filiere("gi-ilsi") == "GI-ILSI"


def test_code_with_extra_text():
    assert resolve_filiere("GI-ILSI - 2024") == "GI-ILSI"


def test_unknown_returns_none():
    assert resolve_filiere("Nonexistent Filiere") is None


def test_empty_returns_none():
    assert resolve_filiere("") is None
    assert resolve_filiere(None) is None
