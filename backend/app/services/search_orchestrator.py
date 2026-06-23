import asyncio
from datetime import datetime, timezone

import httpx

from app.config import settings
from app.core.rate_limiter import RateLimiter
from app.services import places_client
from app.services.grid import generate_cells
from app.services.progress_tracker import tracker
from app.models.territory import Bounds


class SearchOrchestrator:
    """Runs a full territory search as a background task."""

    def __init__(self, db_pool, search_id: int, territory_bounds: Bounds,
                 keywords: list[str], radius_m: int, territorio_nombre: str,
                 field_mask: str = "basic,contact"):
        self.db = db_pool
        self.search_id = search_id
        self.bounds = territory_bounds
        self.keywords = keywords
        self.radius_m = radius_m
        self.territorio = territorio_nombre
        self.field_mask = field_mask
        self._abort = False
        self._seen: set[str] = set()
        self._rate_limiter = RateLimiter(
            max_concurrent=settings.search_max_concurrent,
            delay_ms=settings.search_delay_ms,
        )

    def abort(self):
        self._abort = True

    async def run(self):
        resolution, cells = generate_cells(self.bounds, self.radius_m)
        total_tasks = len(cells) * len(self.keywords)
        tracker.register(self.search_id, total_tasks)

        await self._update_search_status("running", total_cells=total_tasks)

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                for keyword in self.keywords:
                    for cell in cells:
                        if self._abort:
                            await self._update_search_status("cancelled")
                            return

                        new_places = await self._search_cell(
                            client, cell.lat, cell.lng, keyword
                        )
                        await tracker.emit_cell_done(self.search_id, new_places)

            await self._update_search_status("completed")
            await tracker.complete(self.search_id)

        except Exception as e:
            await self._update_search_status("failed")
            await tracker.fail(self.search_id, str(e))
        finally:
            tracker.cleanup(self.search_id)

    async def _search_cell(self, client: httpx.AsyncClient,
                           lat: float, lng: float, keyword: str) -> int:
        async with self._rate_limiter:
            raw_places = await places_client.search_nearby(
                client, lat, lng, self.radius_m, keyword, self.field_mask
            )

        new_count = 0
        for raw in raw_places:
            place_id = raw.get("id", "")
            if place_id in self._seen:
                continue
            self._seen.add(place_id)

            normalized = places_client.normalize_place(raw, keyword, self.territorio)
            db_place_id = await self._upsert_place(normalized)
            await self._link_to_search(db_place_id, keyword)

            marker_data = {
                "nombre": normalized["nombre"],
                "keyword": keyword,
                "latitud": normalized["latitud"],
                "longitud": normalized["longitud"],
                "calificacion": normalized["calificacion"],
                "direccion_completa": normalized["direccion_completa"],
                "enlace_maps": normalized["enlace_maps"],
            }
            await tracker.emit_place_found(self.search_id, marker_data)
            new_count += 1

        return new_count

    async def _upsert_place(self, place: dict) -> int:
        async with self.db.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO places (
                    google_place_id, nombre, direccion_completa, telefono,
                    sitio_web, calificacion, total_calificaciones, estado_negocio,
                    nivel_precio, tipos, location, pais, provincia, localidad,
                    barrio, calle, numero, codigo_postal, horarios, descripcion,
                    foto_url, enlace_maps, data_freshness, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    ST_SetSRID(ST_MakePoint($11, $12), 4326),
                    $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
                    'full', NOW()
                )
                ON CONFLICT (google_place_id) DO UPDATE SET
                    nombre = COALESCE(EXCLUDED.nombre, places.nombre),
                    telefono = COALESCE(EXCLUDED.telefono, places.telefono),
                    sitio_web = COALESCE(EXCLUDED.sitio_web, places.sitio_web),
                    calificacion = COALESCE(EXCLUDED.calificacion, places.calificacion),
                    total_calificaciones = COALESCE(EXCLUDED.total_calificaciones, places.total_calificaciones),
                    data_freshness = 'full',
                    updated_at = NOW()
                RETURNING id
            """,
                place["google_place_id"], place["nombre"],
                place["direccion_completa"], place["telefono"],
                place["sitio_web"], place["calificacion"],
                place["total_calificaciones"], place["estado_negocio"],
                place["nivel_precio"], place["tipos"],
                place["longitud"], place["latitud"],
                place["pais"], place["provincia"], place["localidad"],
                place["barrio"], place["calle"], place["numero"],
                place["codigo_postal"], place["horarios"],
                place["descripcion"], place["foto_url"], place["enlace_maps"],
            )
            return row["id"]

    async def _link_to_search(self, place_id: int, keyword: str):
        async with self.db.acquire() as conn:
            await conn.execute("""
                INSERT INTO search_results (search_id, place_id, keyword, found_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (search_id, place_id, keyword) DO NOTHING
            """, self.search_id, place_id, keyword)

    async def _update_search_status(self, status: str, total_cells: int | None = None):
        progress = tracker.get(self.search_id)
        async with self.db.acquire() as conn:
            if status == "running":
                await conn.execute("""
                    UPDATE searches SET status = $1, total_cells = $2,
                    started_at = NOW() WHERE id = $3
                """, status, total_cells, self.search_id)
            elif status in ("completed", "failed", "cancelled"):
                total_places = progress.total_places if progress else 0
                completed_cells = progress.completed_cells if progress else 0
                await conn.execute("""
                    UPDATE searches SET status = $1, completed_at = NOW(),
                    total_places = $2, completed_cells = $3 WHERE id = $4
                """, status, total_places, completed_cells, self.search_id)
