"""FAME backend application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import api_router
from app.config import settings
from app.database import SessionFactory, engine
from app.models import Base
from app.seed.seed import seed_all
from app.services.jobs import close_arq_pool
from app.websocket.routes import router as ws_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fame")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if migrations haven't run yet (dev convenience); migrations
    # are authoritative in production.
    if not settings.is_production:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    async with SessionFactory() as session:
        await seed_all(session)
    logger.info("FAME API started (env=%s)", settings.environment)
    yield
    await close_arq_pool()
    await engine.dispose()


app = FastAPI(
    title="FAME",
    version="0.1.0",
    description="Recruitment Queue & Attribution Platform (ENSAM Meknès)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


app.include_router(api_router)
app.include_router(ws_router)


@app.get("/api/v1/health")
async def health():
    return JSONResponse({"status": "ok"})
