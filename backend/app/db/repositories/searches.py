import json
from decimal import Decimal

import asyncpg


async def create(pool: asyncpg.Pool, territorio_nombre: str, keywords: list[str],
                 radius_m: int, bounds: dict | None, geojson: dict | None,
                 field_mask: str, user_id: str = "") -> int:
    row = await pool.fetchrow(
        """INSERT INTO searches (territorio_nombre, keywords, radius_m, bounds, geojson, field_mask, user_id)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7) RETURNING id""",
        territorio_nombre, keywords, radius_m,
        json.dumps(bounds) if bounds else None,
        json.dumps(geojson) if geojson else None,
        field_mask, user_id,
    )
    return row["id"]


async def update_status(pool: asyncpg.Pool, search_id: int, *,
                        status: str, total_cells: int = 0,
                        completed_cells: int = 0, total_places: int = 0,
                        started_at: str | None = None,
                        completed_at: str | None = None):
    await pool.execute(
        """UPDATE searches SET status=$2, total_cells=$3, completed_cells=$4,
           total_places=$5, started_at=$6::timestamptz, completed_at=$7::timestamptz
           WHERE id=$1""",
        search_id, status, total_cells, completed_cells, total_places,
        started_at, completed_at,
    )


async def get(pool: asyncpg.Pool, search_id: int) -> dict | None:
    row = await pool.fetchrow(
        """SELECT id, territorio_nombre, custom_name, pinned, keywords, radius_m,
                  bounds, geojson, field_mask, status, total_cells, completed_cells,
                  total_places, started_at, completed_at, created_at, user_id
           FROM searches WHERE id = $1""",
        search_id,
    )
    return _row_to_dict(row) if row else None


async def list_all(pool: asyncpg.Pool) -> list[dict]:
    rows = await pool.fetch(
        """SELECT id, territorio_nombre, custom_name, pinned, keywords, radius_m,
                  status, total_cells, completed_cells, total_places,
                  started_at, completed_at, created_at, user_id
           FROM searches ORDER BY created_at DESC"""
    )
    return [_row_to_response(r) for r in rows]


async def pin_search(pool: asyncpg.Pool, search_id: int,
                     pinned: bool, custom_name: str | None) -> bool:
    result = await pool.execute(
        "UPDATE searches SET pinned=$2, custom_name=$3 WHERE id=$1",
        search_id, pinned, custom_name,
    )
    return result == "UPDATE 1"


async def mark_orphaned_as_failed(pool: asyncpg.Pool) -> int:
    """On startup, the in-memory registry is empty — any search still marked
    pending/running belongs to a process that no longer exists (killed by a
    restart mid-search) and will never progress further. Mark it failed instead
    of leaving it stuck forever."""
    result = await pool.execute(
        """UPDATE searches SET status='failed', completed_at=NOW()
           WHERE status IN ('pending', 'running')""",
    )
    return int(result.split()[-1]) if result else 0


def _convert_value(v):
    if isinstance(v, Decimal):
        return float(v)
    return v


def _row_to_dict(row) -> dict:
    d = {k: _convert_value(v) for k, v in dict(row).items()}
    for ts in ("started_at", "completed_at", "created_at"):
        if d.get(ts):
            d[ts] = d[ts].isoformat()
    for json_field in ("geojson", "bounds"):
        if isinstance(d.get(json_field), str):
            d[json_field] = json.loads(d[json_field])
    return d


def _row_to_response(row) -> dict:
    d = {k: _convert_value(v) for k, v in dict(row).items()}
    for ts in ("started_at", "completed_at", "created_at"):
        if d.get(ts):
            d[ts] = d[ts].isoformat()
    return d
