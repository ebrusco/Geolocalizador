import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


async def get_polygon(query: str) -> dict | None:
    """Fetch the real GeoJSON polygon for a locality from OpenStreetMap."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            NOMINATIM_URL,
            params={
                "q": f"{query}, Argentina",
                "format": "json",
                "polygon_geojson": 1,
                "limit": 1,
                "countrycodes": "ar",
            },
            headers={"User-Agent": "ProspectoAI/2.0"},
        )
        resp.raise_for_status()
        data = resp.json()

    if not data:
        return None

    result = data[0]
    geojson = result.get("geojson")

    if not geojson or geojson["type"] not in ("Polygon", "MultiPolygon"):
        return None

    if geojson["type"] == "MultiPolygon":
        from shapely.geometry import shape as _shape
        largest = max(
            geojson["coordinates"],
            key=lambda c: _shape({"type": "Polygon", "coordinates": c}).area,
        )
        geojson = {"type": "Polygon", "coordinates": largest}

    coords_lonlat = geojson["coordinates"][0]
    coords_latlng = [[lat, lng] for lng, lat in coords_lonlat]

    bbox = result.get("boundingbox", [])
    bounds = None
    if len(bbox) == 4:
        bounds = {
            "south": float(bbox[0]),
            "north": float(bbox[1]),
            "west": float(bbox[2]),
            "east": float(bbox[3]),
        }

    return {
        "nombre": result.get("display_name", query),
        "polygon": coords_latlng,
        "geojson": geojson,
        "bounds": bounds,
        "center": {
            "lat": float(result["lat"]),
            "lng": float(result["lon"]),
        },
    }
