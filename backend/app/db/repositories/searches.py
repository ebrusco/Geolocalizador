import json
from decimal import Decimal

import asyncpg


async def create(pool: asyncpg.Pool, territorio_nombre: str, keywords: list[str],
                 radius_m: int, bounds: dict | None, geojson: dict | None,
                 field_mask: str) -> int:
    row = await pool.fetchrow(
        """INSERT INTO searches (territorio_nombre, keywords, radius_m, bounds, geojson, field_mask)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6) RETURNING id""",
        territorio_nombre, keywords, radius_m,
        json.dumps(bounds) if bounds else None,
        json.dumps(geojson) if geojson else None,
        field_mask,
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
        """SELECT id, territorio_nombre, keywords, radius_m, bounds, geojson,
                  field_mask, status, total_cells, completed_cells, total_places,
                  started_at, completed_at, created_at
           FROM searches WHERE id = $1""",
        search_id,
    )
    return _row_to_dict(row) if row else None


async def list_all(pool: asyncpg.Pool) -> list[dict]:
    rows = await pool.fetch(
        """SELECT id, territorio_nombre, keywords, radius_m, status,
                  total_cells, completed_cells, total_places,
                  started_at, completed_at, created_at
           FROM searches ORDER BY created_at DESC"""
    )
    return [_row_to_response(r) for r in rows]


def _convert_value(v):
    if isinstance(v, Decimal):
        return float(v)
    return v


def _row_to_dict(row) -> dict:
    d = {k: _convert_value(v) for k, v in dict(row).items()}
    for ts in ("started_at", "completed_at", "created_at"):
        if d.get(ts):
            d[ts] = d[ts].isoformat()
    return d


def _row_to_response(row) -> dict:
    d = {k: _convert_value(v) for k, v in dict(row).items()}
    for ts in ("started_at", "completed_at", "created_at"):
        if d.get(ts):
            d[ts] = d[ts].isoformat()
    return d
