"""Authentication-related schemas."""

from __future__ import annotations

from pydantic import BaseModel


class SchoolAppAuthRequest(BaseModel):
    """The identity assertion produced by the SchoolApp Cloudflare Worker."""

    assertion: str


class CandidateSessionResponse(BaseModel):
    csrf: str


class OrganizerLoginRequest(BaseModel):
    username: str
    password: str


class OrganizerLoginResponse(BaseModel):
    username: str
    email: str | None
    csrf: str
