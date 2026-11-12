"""Update every organizer's password to ORGANIZER_INITIAL_PASSWORD (from env).

Use after a redeploy that regenerated the env, to bring the live DB in sync
without dropping data (candidates, queue, history are preserved).

Run inside the api container:
    docker compose exec api python sync_organizers.py
"""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.config import settings
from app.database import SessionFactory
from app.models import Organizer
from app.security.passwords import hash_password


async def main() -> None:
    password = settings.organizer_initial_password
    if not password:
        print("ORGANIZER_INITIAL_PASSWORD is empty — nothing to sync")
        return
    async with SessionFactory() as session:
        organizers = (await session.execute(select(Organizer))).scalars().all()
        for org in organizers:
            org.password_hash = hash_password(password)
        await session.commit()
        print(f"synced {len(organizers)} organizer(s) to ORGANIZER_INITIAL_PASSWORD")


if __name__ == "__main__":
    asyncio.run(main())
