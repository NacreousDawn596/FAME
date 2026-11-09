"""API v1 router aggregation."""

from fastapi import APIRouter

from app.api.v1 import auth, candidate, config, organizer

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(candidate.router)
api_router.include_router(config.router)
api_router.include_router(organizer.router)
