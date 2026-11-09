"""Deterministic, idempotent seed: filières, company, organizer bootstrap."""

from __future__ import annotations

import secrets
import string

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Company, Filiere, Organizer
from app.security.passwords import hash_password
from app.seed.filieres import FILIERES


async def seed_filieres(session: AsyncSession) -> None:
    existing = set((await session.execute(select(Filiere.code))).scalars().all())
    for f in FILIERES:
        if f["code"] not in existing:
            session.add(
                Filiere(
                    code=f["code"],
                    intitule=f["intitule"],
                    departement=f["departement"],
                    accreditation=f["accreditation"],
                )
            )
    await session.commit()


async def seed_company(session: AsyncSession) -> None:
    company = (
        await session.execute(select(Company).order_by(Company.id).limit(1))
    ).scalar_one_or_none()
    if company is None:
        session.add(Company(name=settings.default_company_name))
        await session.commit()


def _random_password(length: int = 20) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def seed_organizers(session: AsyncSession) -> list[str]:
    """Bootstrap organizers from ORGANIZER_INITIAL_EMAILS (comma-separated).

    Returns the list of (email, temporary_password) for newly-created accounts.
    """
    import logging

    logger = logging.getLogger("fame")
    created: list[str] = []
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
        logger.info(
            "[NEW ORGANIZER] created username=%s email=%s temporary_password=%s",
            username,
            email,
            password,
        )
        created.append(f"{email} -> temporary password: {password}")
    await session.commit()
    return created


async def seed_all(session: AsyncSession) -> None:
    await seed_filieres(session)
    await seed_company(session)
    await seed_organizers(session)


async def main() -> None:
    from app.database import SessionFactory

    async with SessionFactory() as session:
        created = await seed_organizers(session)
        await seed_filieres(session)
        await seed_company(session)
    print("Seed complete.")
    for line in created:
        print(f"  [NEW ORGANIZER] {line}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
