import ssl as ssl_mod
from pathlib import Path

import asyncpg

from app.config import settings

pool: asyncpg.Pool | None = None


async def init_pool():
    global pool
    dsn = settings.database_url
    kwargs: dict = {"min_size": 2, "max_size": 10}

    if any(h in dsn for h in (".neon.tech", ".supabase.co", "sslmode=require")):
        kwargs["ssl"] = ssl_mod.create_default_context()

    if "-pooler." in dsn:
        kwargs["statement_cache_size"] = 0

    pool = await asyncpg.create_pool(dsn, **kwargs)


async def close_pool():
    global pool
    if pool:
        await pool.close()
        pool = None


def is_connected() -> bool:
    return pool is not None


async def get_pool() -> asyncpg.Pool:
    if pool is None:
        raise RuntimeError("Database pool not initialized")
    return pool


async def run_migrations():
    if pool is None:
        return
    migration = Path(__file__).parent / "db" / "migrations" / "001_initial.sql"
    sql = migration.read_text(encoding="utf-8")
    await pool.execute(sql)
