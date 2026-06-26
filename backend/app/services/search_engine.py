import asyncio
import logging
from datetime import datetime, timezone

import httpx
from shapely.geometry import shape, Point

import app.database as db
from app.config import settings
from app.core.rate_limiter import RateLimiter
from app.services import places_client
from app.services.grid import generate_cells, generate_cells_from_geojson
from app.services.progress_tracker import tracker
from app.models.territory import Bounds

logger = logging.getLogger(__name__)


class SearchRegistry:
    """In-memory search state for active searches. Completed searches are persisted to DB."""

    def __init__(self):
        self._searches: dict[int, dict] = {}
        self._counter = 0

    def create(self, search_id: int | None, keywords: list[str], radius_m: int,
               bounds: Bounds, territorio_nombre: str, field_mask: str,
               geojson: dict | None = None, user_id: str = "") -> int:
        if search_id is None:
            self._counter += 1
            search_id = self._counter
        self._searches[search_id] = {
            "id": search_id,
            "user_id": user_id,
            "keywords": keywords,
            "radius_m": radius_m,
            "bounds": bounds,
            "territorio_nombre": territorio_nombre,
            "field_mask": field_mask,
            "status": "pending",
            "total_cells": 0,
            "completed_cells": 0,
            "total_places": 0,
            "started_at": None,
            "completed_at": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "geojson": geojson,
            "abort": False,
            "places": [],
        }
        return search_id

    def count_running_for_user(self, user_id: str) -> int:
        return sum(
            1 for e in self._searches.values()
            if e.get("user_id") == user_id and e.get("status") == "running"
        )

    def get(self, search_id: int) -> dict | None:
        return self._searches.get(search_id)

    def remove(self, search_id: int):
        self._searches.pop(search_id, None)

    def list_all(self) -> list[dict]:
        return [self.get_response(sid) for sid in sorted(self._searches, reverse=True)]

    def get_response(self, search_id: int) -> dict:
        entry = self._searches[search_id]
        bounds = entry.get("bounds")
        bounds_dict = bounds.model_dump() if hasattr(bounds, "model_dump") else bounds
        return {
            "id": entry["id"],
            "keywords": entry["keywords"],
            "radius_m": entry["radius_m"],
            "status": entry["status"],
            "total_cells": entry["total_cells"],
            "completed_cells": entry["completed_cells"],
            "total_places": entry["total_places"],
            "started_at": entry["started_at"],
            "completed_at": entry["completed_at"],
            "created_at": entry["created_at"],
            "territorio_nombre": entry["territorio_nombre"],
            "geojson": entry.get("geojson"),
            "bounds": bounds_dict,
        }


search_registry = SearchRegistry()

_rate_limiter = RateLimiter(
    max_concurrent=settings.search_max_concurrent,
    delay_ms=settings.search_delay_ms,
)


async def _persist_search(search_id: int, entry: dict):
    """Persist completed search results to database."""
    if not db.is_connected():
        return

    from app.db.repositories import searches as search_repo
    from app.db.repositories import places as places_repo

    try:
        await search_repo.update_status(
            db.pool, search_id,
            status=entry["status"],
            total_cells=entry["total_cells"],
            completed_cells=entry["completed_cells"],
            total_places=entry["total_places"],
            started_at=entry["started_at"],
            completed_at=entry["completed_at"],
        )

        place_ids = await places_repo.upsert_batch(db.pool, entry["places"])
        place_keyword_pairs = [
            (pid, entry["places"][i].get("keyword", ""))
            for i, pid in enumerate(place_ids)
        ]
        await places_repo.add_search_results_batch(db.pool, search_id, place_keyword_pairs)
    except Exception as e:
        logger.error("Failed to persist search %s: %s", search_id, e)


async def run_search(search_id: int):
    entry = search_registry.get(search_id)
    if not entry:
        return

    bounds = entry["bounds"]
    keywords = entry["keywords"]
    radius_m = entry["radius_m"]
    field_mask = entry["field_mask"]
    territorio = entry["territorio_nombre"]
    geojson = entry.get("geojson")

    if geojson:
        resolution, cells = generate_cells_from_geojson(geojson, radius_m)
        territory_shape = shape(geojson)
    else:
        resolution, cells = generate_cells(bounds, radius_m)
        territory_shape = None
    total_tasks = len(cells) * len(keywords)
    tracker.register(search_id, total_tasks)

    entry["status"] = "running"
    entry["total_cells"] = total_tasks
    entry["started_at"] = datetime.now(timezone.utc).isoformat()

    if db.is_connected():
        from app.db.repositories import searches as search_repo
        try:
            await search_repo.update_status(
                db.pool, search_id,
                status="running",
                total_cells=total_tasks,
                started_at=entry["started_at"],
            )
        except Exception:
            pass

    seen: set[str] = set()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for keyword in keywords:
                for cell in cells:
                    if entry["abort"]:
                        entry["status"] = "cancelled"
                        entry["completed_at"] = datetime.now(timezone.utc).isoformat()
                        await tracker.fail(search_id, "Cancelled by user")
                        await _persist_search(search_id, entry)
                        return

                    new_count = 0
                    async with _rate_limiter:
                        raw_places = await places_client.search_nearby(
                            client, cell.lat, cell.lng, radius_m, keyword, field_mask
                        )

                    for raw in raw_places:
                        place_id = raw.get("id", "")
                        if place_id in seen:
                            continue
                        seen.add(place_id)

                        normalized = places_client.normalize_place(raw, keyword, territorio)

                        if territory_shape and normalized["latitud"] and normalized["longitud"]:
                            point = Point(normalized["longitud"], normalized["latitud"])
                            if not territory_shape.contains(point):
                                continue

                        entry["places"].append(normalized)

                        marker_data = {
                            "nombre": normalized["nombre"],
                            "keyword": keyword,
                            "latitud": normalized["latitud"],
                            "longitud": normalized["longitud"],
                            "calificacion": normalized["calificacion"],
                            "direccion_completa": normalized["direccion_completa"],
                            "enlace_maps": normalized["enlace_maps"],
                        }
                        await tracker.emit_place_found(search_id, marker_data)
                        new_count += 1

                    await tracker.emit_cell_done(search_id, new_count)
                    entry["completed_cells"] += 1
                    entry["total_places"] = len(entry["places"])

        entry["status"] = "completed"
        entry["completed_at"] = datetime.now(timezone.utc).isoformat()
        entry["total_places"] = len(entry["places"])
        await tracker.complete(search_id)

        await _persist_search(search_id, entry)

    except Exception as e:
        entry["status"] = "failed"
        entry["completed_at"] = datetime.now(timezone.utc).isoformat()
        await tracker.fail(search_id, str(e))
        await _persist_search(search_id, entry)
    finally:
        await asyncio.sleep(2)
        tracker.cleanup(search_id)
