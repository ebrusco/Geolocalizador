from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
import app.database as db
from app.database import init_pool, close_pool, run_migrations
from app.auth.dependencies import get_current_user
from app.api import territories, searches, places, exports, keyword_profiles, usage, allowed_emails


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.database_url:
        try:
            await init_pool()
            await run_migrations()
            from app.db.repositories.keyword_profiles import seed_defaults
            from app.db.repositories.allowed_emails import seed_from_env
            if db.pool:
                await seed_defaults(db.pool)
                await seed_from_env(db.pool, settings.allowed_emails)
            print("Database connected and migrations applied.")
        except Exception as e:
            print(f"Warning: DB not connected ({e}). Running in-memory mode.")
    else:
        print("No DATABASE_URL set. Running in-memory mode.")

    if settings.neon_auth_url:
        print(f"Auth enabled. Allowed emails: {settings.allowed_emails or '(all)'}")
    else:
        print("Auth disabled (no NEON_AUTH_URL). All routes are public.")

    yield
    await close_pool()


app = FastAPI(
    title="ProspectoAI",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

auth_dep = [Depends(get_current_user)]

app.include_router(territories.router, prefix="/api/v1/territories", tags=["territories"], dependencies=auth_dep)
app.include_router(searches.router, prefix="/api/v1/searches", tags=["searches"], dependencies=auth_dep)
app.include_router(places.router, prefix="/api/v1", tags=["places"], dependencies=auth_dep)
app.include_router(exports.router, prefix="/api/v1", tags=["exports"], dependencies=auth_dep)
app.include_router(keyword_profiles.router, prefix="/api/v1/keyword-profiles", tags=["keyword-profiles"], dependencies=auth_dep)
app.include_router(usage.router, prefix="/api/v1/usage", tags=["usage"], dependencies=auth_dep)
app.include_router(allowed_emails.router, prefix="/api/v1/allowed-emails", tags=["allowed-emails"], dependencies=auth_dep)


@app.get("/api/v1/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": user}


@app.get("/health")
async def health():
    from app.database import is_connected
    return {"status": "ok", "version": "2.0.0", "database": is_connected(), "auth": bool(settings.neon_auth_url)}
