from fastapi import APIRouter

from app.services.usage_tracker import usage_tracker

router = APIRouter()


@router.get("")
async def get_usage():
    return await usage_tracker.get_summary()


@router.get("/daily")
async def get_daily_breakdown():
    return await usage_tracker.get_daily_breakdown()
