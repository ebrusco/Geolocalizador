from fastapi import APIRouter, Depends, HTTPException, Query

import app.database as db
from app.auth.dependencies import get_current_user, require_owner_or_admin
from app.services.search_engine import search_registry

router = APIRouter()


@router.get("/searches/{search_id}/results")
async def get_search_results(
    search_id: int,
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(500, ge=1, le=500),
    user: dict = Depends(get_current_user),
):
    entry = search_registry.get(search_id)
    if entry:
        require_owner_or_admin(entry.get("user_id"), user)
        places = entry["places"]
    elif db.is_connected():
        from app.db.repositories import searches as search_repo
        db_entry = await search_repo.get(db.pool, search_id)
        if not db_entry:
            raise HTTPException(404, "Search not found")
        require_owner_or_admin(db_entry.get("user_id"), user)
        from app.db.repositories.places import get_places_for_search
        places = await get_places_for_search(db.pool, search_id)
    else:
        raise HTTPException(404, "Search not found")

    if keyword:
        places = [p for p in places if p.get("keyword") == keyword]

    total = len(places)
    start = (page - 1) * per_page
    return {
        "places": places[start : start + per_page],
        "total": total,
        "page": page,
        "per_page": per_page,
    }
