"""Rate limiting using Redis fixed-window counters."""

from __future__ import annotations

import time

from fastapi import HTTPException, Request, status

from app.redis_client import redis_client


async def rate_limit(
    key: str,
    limit: int,
    window_seconds: int,
) -> None:
    """Raise 429 if `key` has exceeded `limit` requests in `window_seconds`."""
    bucket = int(time.time() // window_seconds)
    rkey = f"rl:{key}:{bucket}"
    try:
        current = await redis_client.incr(rkey)
        if current == 1:
            await redis_client.expire(rkey, window_seconds + 1)
        if current > limit:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests")
    except HTTPException:
        raise
    except Exception:  # pragma: no cover - fail open if Redis is down
        return


async def rate_limit_ip(request: Request, limit: int = 120, window: int = 60) -> None:
    client_ip = request.client.host if request.client else "unknown"
    await rate_limit(f"ip:{client_ip}", limit, window)


async def rate_limit_login(username: str) -> None:
    await rate_limit(f"login:{username}", limit=10, window_seconds=300)
