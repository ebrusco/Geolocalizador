from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

import app.database as db
from app.auth.dependencies import get_current_user, _get_admin_emails, require_admin, invalidate_allowed_cache
from app.db.repositories import allowed_emails as ae_repo

router = APIRouter()


def _require_admin(user: dict):
    require_admin(user, "Solo el administrador puede gestionar accesos")


class AddEmailRequest(BaseModel):
    email: EmailStr


@router.get("")
async def list_allowed(user: dict = Depends(get_current_user)):
    _require_admin(user)
    if not db.is_connected():
        return {"emails": [], "admin_emails": list(_get_admin_emails())}
    emails = await ae_repo.list_all(db.pool)
    return {
        "emails": [
            {"id": e["id"], "email": e["email"], "added_by": e["added_by"],
             "created_at": e["created_at"].isoformat() if e["created_at"] else None}
            for e in emails
        ],
        "admin_emails": list(_get_admin_emails()),
    }


@router.post("", status_code=201)
async def add_allowed(req: AddEmailRequest, user: dict = Depends(get_current_user)):
    _require_admin(user)
    if not db.is_connected():
        raise HTTPException(503, "Base de datos no disponible")
    result = await ae_repo.add(db.pool, req.email, user.get("email", ""))
    if not result:
        raise HTTPException(409, "Email ya existe en la lista")
    invalidate_allowed_cache()
    return {"id": result["id"], "email": result["email"], "added_by": result["added_by"],
            "created_at": result["created_at"].isoformat() if result["created_at"] else None}


@router.delete("/{email_id}", status_code=204)
async def remove_allowed(email_id: int, user: dict = Depends(get_current_user)):
    _require_admin(user)
    if not db.is_connected():
        raise HTTPException(503, "Base de datos no disponible")
    deleted = await ae_repo.remove(db.pool, email_id)
    if not deleted:
        raise HTTPException(404, "Email no encontrado")
    invalidate_allowed_cache()
