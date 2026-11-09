#!/usr/bin/env python3
"""Create or update an organizer account (interactive).

Usage:
    cd backend && uv run python ../scripts/create_organizer.py --username admin --email admin@example.com
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import sys

from sqlalchemy import select

sys.path.insert(0, ".")

from app.database import SessionFactory  # noqa: E402
from app.models import Organizer  # noqa: E402
from app.security.passwords import hash_password  # noqa: E402


async def main(username: str, email: str | None) -> None:
    password = getpass.getpass("Password: ")
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords do not match.")
        sys.exit(1)
    if len(password) < 8:
        print("Password must be at least 8 characters.")
        sys.exit(1)

    async with SessionFactory() as session:
        organizer = (
            await session.execute(select(Organizer).where(Organizer.username == username))
        ).scalar_one_or_none()
        if organizer is None:
            organizer = Organizer(username=username, email=email, password_hash=hash_password(password))
            session.add(organizer)
            print(f"Created organizer '{username}'.")
        else:
            organizer.password_hash = hash_password(password)
            organizer.email = email or organizer.email
            print(f"Updated organizer '{username}'.")
        await session.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create/update an organizer account.")
    parser.add_argument("--username", required=True)
    parser.add_argument("--email", default=None)
    args = parser.parse_args()
    asyncio.run(main(args.username, args.email))
