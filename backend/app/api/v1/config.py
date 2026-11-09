"""Public configuration endpoint."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select

from app.config import settings
from app.models import Company, Filiere
from app.security.deps import SessionDep

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/public")
async def public_config(session: SessionDep):
    filieres = (await session.execute(select(Filiere).order_by(Filiere.code))).scalars().all()
    company = (
        await session.execute(select(Company).order_by(Company.id).limit(1))
    ).scalar_one_or_none()

    return {
        "company_name": company.name if company else settings.default_company_name,
        "event_open": True,
        "vapid_public_key": settings.vapid_public_key,
        "approaching_threshold": settings.notification_approaching_threshold,
        "urgent_threshold": settings.notification_urgent_threshold,
        "schoolapp_worker_url": settings.schoolapp_worker_url,
        "filieres": [
            {
                "code": f.code,
                "intitule": f.intitule,
                "departement": f.departement,
                "accreditation": f.accreditation,
            }
            for f in filieres
        ],
    }
