"""Background job enqueueing (ARQ) — thin wrapper over a shared ARQ pool."""

from __future__ import annotations

import asyncio

from arq import create_pool
from arq.connections import RedisSettings

from app.config import settings

_pool = None
_lock = asyncio.Lock()


async def get_arq_pool():
    global _pool
    if _pool is None:
        async with _lock:
            if _pool is None:
                _pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    return _pool


async def enqueue_job(function: str, *args) -> None:
    pool = await get_arq_pool()
    await pool.enqueue_job(function, *args)


async def close_arq_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
