import httpx

from app.config import settings
from app.core.exceptions import GeocodingError
from app.models.territory import Bounds

PLACES_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"
PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places"


async def geocode(query: str) -> tuple[str, Bounds, dict]:
    """Geocode a free-text address query, worldwide.
    Returns (formatted_address, bounds, center)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.google_geocoding_base_url}/json",
            params={
                "address": query,
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


async def autocomplete(query: str) -> list[dict]:
    """Place autocomplete suggestions, worldwide. Returns list of
    {place_id, main_text, secondary_text}."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            PLACES_AUTOCOMPLETE_URL,
            json={"input": query, "includedPrimaryTypes": ["locality", "postal_code", "administrative_area_level_1", "administrative_area_level_2", "sublocality"]},
            headers={
                "X-Goog-Api-Key": settings.google_api_key,
                "Content-Type": "application/json",
            },
            timeout=8.0,
        )
        resp.raise_for_status()
        data = resp.json()

    suggestions = []
    for s in data.get("suggestions", []):
        pred = s.get("placePrediction")
        if not pred:
            continue
        fmt = pred.get("structuredFormat", {})
        suggestions.append({
            "place_id": pred["placeId"],
            "main_text": fmt.get("mainText", {}).get("text", pred.get("text", {}).get("text", "")),
            "secondary_text": fmt.get("secondaryText", {}).get("text", ""),
        })
    return suggestions


async def get_place_details(place_id: str) -> dict:
    """Resolve a place_id to formatted_address, bounds, center and country code."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{PLACES_DETAILS_URL}/{place_id}",
            headers={
                "X-Goog-Api-Key": settings.google_api_key,
                "X-Goog-FieldMask": "id,displayName,formattedAddress,viewport,location,addressComponents",
            },
            timeout=8.0,
        )
        if resp.status_code != 200:
            raise GeocodingError("No se pudo resolver el lugar seleccionado.")
        data = resp.json()

    vp = data.get("viewport")
    if vp:
        bounds = Bounds(
            north=vp["high"]["latitude"],
            south=vp["low"]["latitude"],
            east=vp["high"]["longitude"],
            west=vp["low"]["longitude"],
        )
    else:
        loc = data["location"]
        delta = 0.05
        bounds = Bounds(
            north=loc["latitude"] + delta, south=loc["latitude"] - delta,
            east=loc["longitude"] + delta, west=loc["longitude"] - delta,
        )

    center = {"lat": data["location"]["latitude"], "lng": data["location"]["longitude"]}

    country_code = ""
    for comp in data.get("addressComponents", []):
        if "country" in comp.get("types", []):
            country_code = comp.get("shortText", "")
            break

    return {
        "nombre": data.get("formattedAddress") or data.get("displayName", {}).get("text", ""),
        "bounds": bounds,
        "center": center,
        "country_code": country_code,
    }
