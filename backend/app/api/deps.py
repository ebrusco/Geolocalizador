from fastapi import Depends
import asyncpg

from app.database import get_pool


async def get_db() -> asyncpg.Pool:
    return await get_pool()
