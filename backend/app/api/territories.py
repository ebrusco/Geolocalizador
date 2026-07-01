from fastapi import APIRouter, HTTPException, Query

from app.models.territory import (
    GeocodeRequest,
    GeocodePlaceRequest,
    PolygonRequest,
    GridResponse,
    GridFromPolygonRequest,
    Bounds,
)
from app.services.territory import (
    geocode_and_grid, polygon_and_grid, recalc_grid, recalc_grid_polygon,
    autocomplete_territory, geocode_place_and_grid,
)
from app.core.exceptions import GeocodingError, GridTooLargeError

router = APIRouter()


@router.get("/autocomplete")
async def autocomplete_endpoint(q: str = Query(..., min_length=2)):
    suggestions = await autocomplete_territory(q)
    return {"suggestions": suggestions}


@router.post("/geocode")
async def geocode_territory(req: GeocodeRequest):
    try:
        result = await geocode_and_grid(req.query, req.radius_m)
    except GeocodingError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except GridTooLargeError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {
        "id": 0,
        "nombre": result["nombre"],
        "bounds": result["bounds"],
        "area_km2": result["area_km2"],
        "h3_resolution": result["h3_resolution"],
        "h3_cell_count": result["h3_cell_count"],
        "cells": result["cells"],
        "polygon": result.get("polygon"),
        "geojson": result.get("geojson"),
        "created_at": "",
    }


@router.post("/geocode-place")
async def geocode_place_territory(req: GeocodePlaceRequest):
    try:
        result = await geocode_place_and_grid(req.place_id, req.radius_m)
    except GeocodingError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except GridTooLargeError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {
        "id": 0,
        "nombre": result["nombre"],
        "bounds": result["bounds"],
        "area_km2": result["area_km2"],
        "h3_resolution": result["h3_resolution"],
        "h3_cell_count": result["h3_cell_count"],
        "cells": result["cells"],
        "polygon": result.get("polygon"),
        "geojson": result.get("geojson"),
        "created_at": "",
    }


@router.post("/polygon")
async def polygon_territory(req: PolygonRequest):
    try:
        result = polygon_and_grid(req.coordinates, req.radius_m)
    except GridTooLargeError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return {
        "id": 0,
        "nombre": result["nombre"],
        "bounds": result["bounds"],
        "area_km2": result["area_km2"],
        "h3_resolution": result["h3_resolution"],
        "h3_cell_count": result["h3_cell_count"],
        "cells": result["cells"],
        "polygon": result.get("polygon"),
        "geojson": result.get("geojson"),
        "created_at": "",
    }


@router.post("/grid")
async def compute_grid(bounds: Bounds, radius_m: int = 500):
    try:
        result = recalc_grid(bounds, radius_m)
    except GridTooLargeError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return result


@router.post("/grid-polygon")
async def compute_grid_polygon(req: GridFromPolygonRequest):
    try:
        result = recalc_grid_polygon(req.geojson, req.radius_m)
    except GridTooLargeError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return result
