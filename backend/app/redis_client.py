"""Redis connection (async) shared by the API and worker."""

from __future__ import annotations

import redis.asyncio as aioredis

from app.config import settings

redis_client: aioredis.Redis = aioredis.from_url(
    settings.redis_url, encoding="utf-8", decode_responses=True
)

# Queue name for ARQ.
ARQ_QUEUE = "fame:notifications"
