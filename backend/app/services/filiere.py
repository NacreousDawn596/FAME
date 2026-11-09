"""Filière resolution: normalize SchoolApp's `filiere` value to a canonical code."""

from __future__ import annotations

from functools import lru_cache

from app.seed.filieres import FILIERES

_CODES: frozenset[str] = frozenset(f["code"] for f in FILIERES)
_CODE_TO_INTITULE: dict[str, str] = {f["code"]: f["intitule"] for f in FILIERES}

# Lowercase-code -> canonical code for fast case-insensitive lookup.
_LOWER_TO_CODE: dict[str, str] = {c.lower(): c for c in _CODES}


@lru_cache(maxsize=256)
def resolve_filiere(raw: str | None) -> str | None:
    """Return the canonical filière code for a raw SchoolApp value, or None."""
    if not raw:
        return None
    value = raw.strip()
    if not value:
        return None

    upper = value.upper()

    # 1. Exact code match (case-insensitive).
    if upper in _CODES:
        return upper
    if value.lower() in _LOWER_TO_CODE:
        return _LOWER_TO_CODE[value.lower()]

    # 2. Match a known code appearing as a token/substring in the value.
    #    e.g. "GI-ILSI - 2024" -> "GI-ILSI"
    for code in sorted(_CODES, key=len, reverse=True):
        if code.lower() in value.lower():
            return code

    # 3. Match by intitulé (display name) — best-effort.
    for code, intitule in _CODE_TO_INTITULE.items():
        if value.lower() == intitule.lower():
            return code

    return None


def get_filiere_name(code: str | None) -> str | None:
    if code is None:
        return None
    return _CODE_TO_INTITULE.get(code)
