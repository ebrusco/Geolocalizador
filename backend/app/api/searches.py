import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

import app.database as db
from app.auth.dependencies import get_current_user
from app.models.search import SearchRequest, SearchResponse, EstimateRequest
from app.services.search_engine import search_registry, run_search
from app.services.grid import generate_cells, generate_cells_from_geojson
from app.services.usage_tracker import usage_tracker, COST_PER_CALL_USD

router = APIRouter()

MAX_CONCURRENT_PER_USER = 3


@router.post("/estimate")
async def estimate_search(req: EstimateRequest):
    try:
        if req.geojson:
            _, cells = generate_cells_from_geojson(req.geojson, req.radius_m)
        else:
            _, cells = generate_cells(req.bounds, req.radius_m)
    except Exception as e:
        raise HTTPException(422, str(e))

    total_cells = len(cells)
    total_calls = total_cells * req.keyword_count
    gross_cost = round(total_calls * COST_PER_CALL_USD, 2)

    summary = await usage_tracker.get_summary()
    free_calls_remaining = summary["free_calls_remaining"]

    covered_by_free = min(total_calls, free_calls_remaining)
    paid_calls = max(0, total_calls - free_calls_remaining)
    real_cost = round(paid_calls * COST_PER_CALL_USD, 2)

    if real_cost == 0:
        level = "green"
    elif paid_calls <= 500:
        level = "yellow"
    else:
        level = "red"

    return {
        "total_cells": total_cells,
        "total_api_calls": total_calls,
        "estimated_cost_usd": gross_cost,
        "real_cost_usd": real_cost,
        "free_calls_remaining": free_calls_remaining,
        "covered_by_free": covered_by_free,
        "paid_calls": paid_calls,
        "level": level,
    }


@router.post("", response_model=SearchResponse, status_code=201)
async def start_search(
    req: SearchRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    user_id = user.get("id", "anonymous")
    running = search_registry.count_running_for_user(user_id)
    if running >= MAX_CONCURRENT_PER_USER:
        raise HTTPException(
            429,
            f"Máximo {MAX_CONCURRENT_PER_USER} búsquedas simultáneas por usuario. "
            "Esperá a que terminen las actuales.",
        )

    db_search_id = None
    if db.is_connected():
        from app.db.repositories import searches as search_repo
        bounds_dict = req.bounds.model_dump() if req.bounds else None
        db_search_id = await search_repo.create(
            db.pool,
            territorio_nombre=req.territorio_nombre,
            keywords=req.keywords,
            radius_m=req.radius_m,
            bounds=bounds_dict,
            geojson=req.geojson,
            field_mask=req.field_mask,
        )

    search_id = search_registry.create(
        search_id=db_search_id,
        user_id=user_id,
        keywords=req.keywords,
        radius_m=req.radius_m,
        bounds=req.bounds,
        territorio_nombre=req.territorio_nombre,
        field_mask=req.field_mask,
        geojson=req.geojson,
    )
    background_tasks.add_task(run_search, search_id)
    return search_registry.get_response(search_id)


@router.get("")
async def list_searches():
    if db.is_connected():
        from app.db.repositories import searches as search_repo
        db_searches = await search_repo.list_all(db.pool)
        active = search_registry.list_all()
        active_ids = {s["id"] for s in active}
        merged = list(active)
        for s in db_searches:
            if s["id"] not in active_ids:
                merged.append(s)
        merged.sort(key=lambda s: s.get("created_at", ""), reverse=True)
        return {"searches": merged, "total": len(merged)}

    searches = search_registry.list_all()
    return {"searches": searches, "total": len(searches)}


@router.get("/{search_id}", response_model=SearchResponse)
async def get_search(search_id: int):
    entry = search_registry.get(search_id)
    if entry:
        return search_registry.get_response(search_id)

    if db.is_connected():
        from app.db.repositories import searches as search_repo
        db_entry = await search_repo.get(db.pool, search_id)
        if db_entry:
            return db_entry

    raise HTTPException(404, "Search not found")


@router.get("/{search_id}/stream")
async def stream_search(search_id: int):
    from app.services.progress_tracker import tracker

    progress = tracker.get(search_id)
    if not progress and search_registry.get(search_id) is None:
        raise HTTPException(404, "Search not found")

    async def event_generator():
        entry = search_registry.get(search_id)
        if not entry:
            return

        while True:
            progress = tracker.get(search_id)
            if progress is None:
                if entry["status"] in ("completed", "failed", "cancelled"):
                    yield {
                        "event": "completed",
                        "data": json.dumps({"total_places": entry["total_places"]}),
                    }
                return

            try:
                event = await asyncio.wait_for(progress.queue.get(), timeout=30.0)
                yield {
                    "event": event["event"],
                    "data": json.dumps(event["data"]),
                }
                if event["event"] in ("completed", "error"):
                    return
            except asyncio.TimeoutError:
                yield {"event": "ping", "data": ""}

    return EventSourceResponse(event_generator())


@router.post("/{search_id}/cancel")
async def cancel_search(search_id: int):
    entry = search_registry.get(search_id)
    if not entry:
        raise HTTPException(404, "Search not found")
    entry["abort"] = True
    return {"status": "cancelling"}


@router.delete("")
async def clear_all_searches(user: dict = Depends(get_current_user)):
    """Admin-only: delete all searches, places and usage history."""
    from app.auth.dependencies import _get_admin_emails
    admins = _get_admin_emails()
    if admins and user.get("email", "").lower() not in admins:
        raise HTTPException(403, "Solo el administrador puede borrar el historial")
    if not db.is_connected():
        raise HTTPException(503, "Base de datos no disponible")

    async with db.pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("DELETE FROM api_usage")
            await conn.execute("DELETE FROM search_results")
            await conn.execute("DELETE FROM searches")
            await conn.execute("DELETE FROM places")

    # Clear in-memory state
    search_registry._searches.clear()
    from app.services.usage_tracker import usage_tracker
    usage_tracker._calls.clear()
    usage_tracker._summary_cache = None

    return {"deleted": True}
