"""Drop, recreate, and re-seed the FAME database. Prints fresh organizer credentials.

Run it *inside* the running API container (so it can reach the `postgres` host):

    docker compose exec api python db-reset.py

The reset is destructive: every table is dropped, then recreated and re-seeded
(filières, default company, organizers). Organizers from
``ORGANIZER_INITIAL_EMAILS`` get brand-new temporary passwords.
"""

from __future__ import annotations

import asyncio
import secrets
import string

from sqlalchemy import select

from app.config import settings
from app.database import Base, SessionFactory, engine
from app.models import Company, Filiere, Organizer
from app.security.passwords import hash_password
from app.seed.filieres import FILIERES
from app.seed.seed import seed_company, seed_filieres


def _random_password(length: int = 20) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def _seed_organizers(session) -> list[tuple[str, str, str]]:
    created: list[tuple[str, str, str]] = []
    emails = [e.strip() for e in settings.organizer_initial_emails.split(",") if e.strip()]
    for email in emails:
        existing = (
            await session.execute(select(Organizer).where(Organizer.email == email))
        ).scalar_one_or_none()
        if existing is not None:
            continue
        password = _random_password()
        username = email.split("@")[0]
        session.add(
            Organizer(username=username, email=email, password_hash=hash_password(password))
        )
        created.append((username, email, password))
    await session.commit()
    return created


async def main() -> None:
    print(f"Resetting database for company: {settings.default_company_name}")
    print(f"  target : {settings.database_url}")
    print("Dropping all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    print("Creating all tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print(f"Seeding {len(FILIERES)} filières, default company, organizers...")
    async with SessionFactory() as session:
        await seed_filieres(session)
        await seed_company(session)
        created = await _seed_organizers(session)

    await engine.dispose()

    print()
    print("=" * 62)
    print(" DATABASE RESET COMPLETE")
    print("=" * 62)
    if not created:
        print(" No new organizers.")
        print(" (ORGANIZER_INITIAL_EMAILS is empty or accounts already exist.)")
    else:
        print(f" Organizer accounts created: {len(created)}")
        for username, email, password in created:
            print()
            print(f"   Email     : {email}")
            print(f"   Username  : {username}")
            print(f"   Password  : {password}")
    print()
    print(f"   Login URL : {settings.frontend_url.rstrip('/')}/#/login")
    print("=" * 62)


if __name__ == "__main__":
    asyncio.run(main())
