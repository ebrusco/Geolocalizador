import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sse_starlette.sse import EventSourceResponse

import app.database as db
from app.auth.dependencies import get_current_user, require_owner_or_admin
from app.services.search_engine import search_registry
from app.services.export import generate_csv, generate_xlsx, export_filename
from app.services.email_scraper import scrape_emails_for_search

router = APIRouter()


async def _get_search_data(search_id: int) -> tuple[dict | None, list[dict], str]:
    """Get search entry, places list and territory name. Checks in-memory first, then DB."""
    entry = search_registry.get(search_id)
    if entry:
        return entry, entry["places"], entry["territorio_nombre"]

    if db.is_connected():
        from app.db.repositories import searches as search_repo
        from app.db.repositories import places as places_repo
        db_entry = await search_repo.get(db.pool, search_id)
        if db_entry:
            places = await places_repo.get_places_for_search(db.pool, search_id)
            return db_entry, places, db_entry["territorio_nombre"]

    return None, [], ""


@router.get("/searches/{search_id}/export")
async def export_search(search_id: int, format: str = "xlsx", user: dict = Depends(get_current_user)):
    entry, places, territorio = await _get_search_data(search_id)
    if not entry:
        raise HTTPException(404, "Search not found")
    require_owner_or_admin(entry.get("user_id"), user)

    if entry["status"] != "completed":
        raise HTTPException(400, "Search not completed yet")

    emails = entry.get("scraped_emails", {}) if isinstance(entry, dict) else {}
    if emails:
        places = _inject_emails(places, emails)

    if format == "csv":
        content = generate_csv(places, territorio)
        filename = export_filename(territorio, "csv")
        return Response(
            content=content.encode("utf-8"),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    content = generate_xlsx(places, territorio)
    filename = export_filename(territorio, "xlsx")
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/searches/{search_id}/scrape-emails")
async def scrape_emails(search_id: int, user: dict = Depends(get_current_user)):
    entry = search_registry.get(search_id)
    if not entry:
        raise HTTPException(404, "Search not found (email scraping requires active search)")
    require_owner_or_admin(entry.get("user_id"), user)

    if entry["status"] != "completed":
        raise HTTPException(400, "Search not completed yet")

    if entry.get("email_scrape_status") == "running":
        raise HTTPException(409, "Email scraping already in progress")

    queue: asyncio.Queue = asyncio.Queue()
    entry["email_scrape_status"] = "running"

    async def on_progress(completed: int, total: int, found: int):
        await queue.put({"event": "progress", "data": {
            "completed": completed,
            "total": total,
            "found": found,
        }})

    async def run_scrape():
        try:
            results = await scrape_emails_for_search(entry["places"], on_progress)
            entry["scraped_emails"] = results
            entry["email_scrape_status"] = "completed"
            await queue.put({"event": "completed", "data": {
                "found": len(results),
                "total_with_web": sum(1 for p in entry["places"] if p.get("sitio_web")),
            }})
        except Exception as e:
            entry["email_scrape_status"] = "failed"
            await queue.put({"event": "error", "data": {"detail": str(e)}})

    asyncio.create_task(run_scrape())

    async def event_generator():
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=120.0)
                yield {
                    "event": event["event"],
                    "data": json.dumps(event["data"]),
                }
                if event["event"] in ("completed", "error"):
                    return
            except asyncio.TimeoutError:
                yield {"event": "ping", "data": ""}

    return EventSourceResponse(event_generator())


def _inject_emails(places: list[dict], emails: dict[str, str]) -> list[dict]:
    result = []
    for p in places:
        copy = dict(p)
        copy["email"] = emails.get(p.get("google_place_id", ""))
        result.append(copy)
    return result
