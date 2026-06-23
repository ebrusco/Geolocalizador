from fastapi import APIRouter, HTTPException, Query

from app.services.search_engine import search_registry

router = APIRouter()


@router.get("/searches/{search_id}/results")
async def get_search_results(
    search_id: int,
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=500),
):
    entry = search_registry.get(search_id)
    if not entry:
        raise HTTPException(404, "Search not found")

    places = entry["places"]
    if keyword:
        places = [p for p in places if p.get("keyword") == keyword]

    total = len(places)
    start = (page - 1) * per_page
    page_places = places[start : start + per_page]

    return {
        "places": page_places,
        "total": total,
        "page": page,
        "per_page": per_page,
    }
