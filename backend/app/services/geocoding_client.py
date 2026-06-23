import httpx

from app.config import settings
from app.core.exceptions import GeocodingError
from app.models.territory import Bounds


async def geocode(query: str) -> tuple[str, Bounds, dict]:
    """Geocode an address query restricted to Argentina.
    Returns (formatted_address, bounds, center)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.google_geocoding_base_url}/json",
            params={
                "address": f"{query}, Argentina",
                "components": "country:AR",
                "key": settings.google_api_key,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    if data["status"] != "OK" or not data["results"]:
        raise GeocodingError(f'No se encontró "{query}".')

    result = data["results"][0]
    vp = result["geometry"]["viewport"]
    bounds = Bounds(
        north=vp["northeast"]["lat"],
        south=vp["southwest"]["lat"],
        east=vp["northeast"]["lng"],
        west=vp["southwest"]["lng"],
    )
    center = {
        "lat": result["geometry"]["location"]["lat"],
        "lng": result["geometry"]["location"]["lng"],
    }
    return result["formatted_address"], bounds, center
