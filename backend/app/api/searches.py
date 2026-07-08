import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

import app.database as db
from app.auth.dependencies import get_current_user, is_admin, require_admin, require_owner_or_admin
from app.models.search import SearchRequest, SearchResponse, EstimateRequest
from app.services.search_engine import search_registry, run_search, _persist_search
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
            user_id=user_id,
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


def _is_owned_by(resource_user_id: str | None, user: dict) -> bool:
    if is_admin(user):
        return True
    return not resource_user_id or resource_user_id == user.get("id")


@router.get("")
async def list_searches(user: dict = Depends(get_current_user)):
    admin = is_admin(user)
    user_id = user.get("id", "anonymous")

    if db.is_connected():
        from app.db.repositories import searches as search_repo
        db_searches = await search_repo.list_all(db.pool)
        active = search_registry.list_all()
        active_ids = {s["id"] for s in active}
        merged = list(active)
        for s in db_searches:
            if s["id"] not in active_ids:
                merged.append(s)
        if not admin:
            merged = [s for s in merged if _is_owned_by(s.get("user_id"), user)]
        merged.sort(key=lambda s: s.get("created_at", ""), reverse=True)
        return {"searches": merged, "total": len(merged)}

    searches = search_registry.list_all()
    if not admin:
        searches = [s for s in searches if _is_owned_by(s.get("user_id"), user)]
    return {"searches": searches, "total": len(searches)}


@router.get("/{search_id}")
async def get_search(search_id: int, user: dict = Depends(get_current_user)):
    entry = search_registry.get(search_id)
    if entry:
        require_owner_or_admin(entry.get("user_id"), user)
        return search_registry.get_response(search_id)

    if db.is_connected():
        from app.db.repositories import searches as search_repo
        db_entry = await search_repo.get(db.pool, search_id)
        if db_entry:
            require_owner_or_admin(db_entry.get("user_id"), user)
            return db_entry

    raise HTTPException(404, "Search not found")


@router.get("/{search_id}/stream")
async def stream_search(search_id: int, user: dict = Depends(get_current_user)):
    from app.services.progress_tracker import tracker

    entry = search_registry.get(search_id)
    progress = tracker.get(search_id)
    if not progress and entry is None:
        raise HTTPException(404, "Search not found")
    if entry:
        require_owner_or_admin(entry.get("user_id"), user)

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


@router.post("/{search_id}/resync")
async def resync_search(search_id: int, user: dict = Depends(get_current_user)):
    """Admin-only debug tool: re-attempt persisting an in-memory search to the DB
    and surface the real error if it fails (normally swallowed/logged only)."""
    require_admin(user)
    entry = search_registry.get(search_id)
    if not entry:
        raise HTTPException(404, "Search not in memory")
    error = await _persist_search(search_id, entry)
    return {"persisted": error is None, "error": error, "total_places": entry["total_places"]}


@router.patch("/{search_id}/pin")
async def pin_search(search_id: int, body: dict, user: dict = Depends(get_current_user)):
    if not db.is_connected():
        raise HTTPException(503, "Base de datos no disponible")
    from app.db.repositories import searches as search_repo
    db_entry = await search_repo.get(db.pool, search_id)
    if not db_entry:
        raise HTTPException(404, "Search not found")
    require_owner_or_admin(db_entry.get("user_id"), user)
    pinned = bool(body.get("pinned", False))
    custom_name = body.get("custom_name") or None
    ok = await search_repo.pin_search(db.pool, search_id, pinned, custom_name)
    if not ok:
        raise HTTPException(404, "Search not found")
    return {"pinned": pinned, "custom_name": custom_name}


@router.post("/{search_id}/cancel")
async def cancel_search(search_id: int, user: dict = Depends(get_current_user)):
    entry = search_registry.get(search_id)
    if not entry:
        raise HTTPException(404, "Search not found")
    require_owner_or_admin(entry.get("user_id"), user)
    entry["abort"] = True
    return {"status": "cancelling"}


@router.delete("")
async def clear_all_searches(user: dict = Depends(get_current_user)):
    """Admin-only: delete all searches, places and usage history."""
    require_admin(user, "Solo el administrador puede borrar el historial")
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
