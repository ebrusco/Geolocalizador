import logging
import time

import app.database as db
from app.db.repositories import allowed_emails as ae_repo
from fastapi import HTTPException, Request

from app.config import settings

logger = logging.getLogger(__name__)

_CACHE_MAX_SIZE = 1000
_CACHE_TTL = 300
_cache: dict[str, tuple[dict, float]] = {}

_allowed_cache: tuple[set[str], float] = (set(), 0.0)
_ALLOWED_TTL = 60

_SESSION_QUERY = """
    SELECT u.id, u.name, u.email
    FROM neon_auth.session s
    JOIN neon_auth."user" u ON u.id = s."userId"
    WHERE s.token = $1 AND s."expiresAt" > NOW()
"""


def _evict_expired():
    now = time.time()
    expired = [k for k, (_, ts) in _cache.items() if now - ts >= _CACHE_TTL]
    for k in expired:
        del _cache[k]


def _get_admin_emails() -> set[str]:
    if not settings.allowed_emails:
        return set()
    return {e.strip().lower() for e in settings.allowed_emails.split(",") if e.strip()}


def is_admin(user: dict) -> bool:
    """True if user is an admin, or if auth is fully disabled (local dev)."""
    admins = _get_admin_emails()
    if not admins:
        return not settings.neon_auth_url
    return user.get("email", "").lower() in admins


def require_admin(user: dict, message: str = "Solo el administrador puede realizar esta acción"):
    admins = _get_admin_emails()
    if not admins:
        if not settings.neon_auth_url:
            return  # auth fully disabled (local dev) — no concept of admin
        raise HTTPException(403, "No hay administradores configurados (ALLOWED_EMAILS vacío)")
    if user.get("email", "").lower() not in admins:
        raise HTTPException(403, message)


def require_owner_or_admin(resource_user_id: str | None, user: dict,
                            message: str = "No tenés acceso a este recurso"):
    if is_admin(user):
        return
    if resource_user_id and resource_user_id != user.get("id"):
        raise HTTPException(403, message)


async def _get_allowed_emails() -> set[str]:
    global _allowed_cache
    now = time.time()
    cached_set, cached_ts = _allowed_cache
    if cached_set and now - cached_ts < _ALLOWED_TTL:
        return cached_set

    admin_emails = _get_admin_emails()
    if db.is_connected():
        db_emails = await ae_repo.get_all_emails(db.pool)
        all_emails = admin_emails | db_emails
    else:
        all_emails = admin_emails

    _allowed_cache = (all_emails, now)
    return all_emails


def invalidate_allowed_cache():
    global _allowed_cache
    _allowed_cache = (set(), 0.0)


async def get_current_user(request: Request) -> dict:
    if not settings.neon_auth_url:
        return {"id": "local", "email": "local@dev", "name": "Dev"}

    if not db.is_connected():
        if settings.environment == "production":
            raise HTTPException(503, "Servicio temporalmente no disponible")
        return {"id": "local", "email": "local@dev", "name": "Dev"}

    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    else:
        token = request.query_params.get("token")

    if not token:
        raise HTTPException(401, "Token requerido")

    now = time.time()
    if token in _cache:
        data, ts = _cache[token]
        if now - ts < _CACHE_TTL:
            return data

    row = await db.pool.fetchrow(_SESSION_QUERY, token)
    if not row:
        _cache.pop(token, None)
        raise HTTPException(401, "Sesión inválida o expirada")

    user = {"id": str(row["id"]), "email": row["email"], "name": row["name"] or ""}

    allowed = await _get_allowed_emails()
    if allowed and user["email"].lower() not in allowed:
        raise HTTPException(403, "No tenés acceso a esta aplicación")

    if len(_cache) >= _CACHE_MAX_SIZE:
        _evict_expired()
    _cache[token] = (user, now)
    return user


def clear_session_cache(token: str | None = None):
    if token:
        _cache.pop(token, None)
    else:
        _cache.clear()
