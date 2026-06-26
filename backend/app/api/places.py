from fastapi import APIRouter, HTTPException, Query

import app.database as db
from app.services.search_engine import search_registry

router = APIRouter()


@router.get("/searches/{search_id}/results")
async def get_search_results(
    search_id: int,
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(500, ge=1, le=500),
):
    entry = search_registry.get(search_id)
    if entry:
        places = entry["places"]
    elif db.is_connected():
        from app.db.repositories.places import get_places_for_search
        places = await get_places_for_search(db.pool, search_id)
        if not places:
            # Verify search exists
            from app.db.repositories import searches as search_repo
            if not await search_repo.get(db.pool, search_id):
                raise HTTPException(404, "Search not found")
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
