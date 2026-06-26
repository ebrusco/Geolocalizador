import asyncio

import httpx

from app.config import settings
from app.core.exceptions import PlacesAPIError
from app.services.usage_tracker import usage_tracker

FIELD_MASKS = {
    "basic": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.types",
        "places.businessStatus",
        "places.googleMapsUri",
        "places.photos",
    ],
    "contact": [
        "places.internationalPhoneNumber",
        "places.nationalPhoneNumber",
        "places.websiteUri",
        "places.addressComponents",
    ],
    "atmosphere": [
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.regularOpeningHours",
        "places.editorialSummary",
    ],
}


def build_field_mask(mask_str: str) -> str:
    parts = [m.strip() for m in mask_str.split(",")]
    fields = []
    for p in parts:
        fields.extend(FIELD_MASKS.get(p, []))
    return ",".join(fields)


def _cell_to_rect(lat: float, lng: float, radius_m: int) -> dict:
    """Convert a cell center + radius into a lat/lng rectangle for locationRestriction."""
    import math
    lat_delta = radius_m / 111_320
    lng_delta = radius_m / (111_320 * math.cos(math.radians(lat)))
    return {
        "rectangle": {
            "low": {"latitude": lat - lat_delta, "longitude": lng - lng_delta},
            "high": {"latitude": lat + lat_delta, "longitude": lng + lng_delta},
        }
    }


async def search_nearby(
    client: httpx.AsyncClient,
    lat: float,
    lng: float,
    radius_m: int,
    keyword: str,
    field_mask: str = "basic,contact",
    max_retries: int = 3,
) -> list[dict]:
    """Call Google Places API (New) searchText with locationRestriction. Returns raw place dicts."""
    url = f"{settings.google_places_base_url}/places:searchText"
    headers = {
        "X-Goog-Api-Key": settings.google_api_key,
        "X-Goog-FieldMask": build_field_mask(field_mask),
        "Content-Type": "application/json",
    }
    body = {
        "textQuery": keyword,
        "maxResultCount": 20,
        "locationRestriction": _cell_to_rect(lat, lng, radius_m),
    }

    for attempt in range(max_retries):
        resp = await client.post(url, json=body, headers=headers)

        if resp.status_code == 200:
            await usage_tracker.record_call(search_id=None)
            data = resp.json()
            return data.get("places", [])

        if resp.status_code == 429:
            wait = 2.0 * (attempt + 1)
            await asyncio.sleep(wait)
            continue

        if resp.status_code == 403:
            detail = resp.json().get("error", {}).get("message", resp.text)
            raise PlacesAPIError(resp.status_code, f"API no habilitada o sin permisos: {detail}")

        raise PlacesAPIError(resp.status_code, resp.text)

    return []


def normalize_place(raw: dict, keyword: str, territorio: str) -> dict:
    """Transform a Places API (New) response into our flat schema."""
    location = raw.get("location", {})
    addr_comps = raw.get("addressComponents", [])

    def addr(type_name: str) -> str | None:
        for comp in addr_comps:
            if type_name in comp.get("types", []):
                return comp.get("longText")
        return None

    display_name = raw.get("displayName", {})
    hours = raw.get("regularOpeningHours", {})
    editorial = raw.get("editorialSummary", {})
    photos = raw.get("photos", [])
    photo_name = photos[0].get("name", "") if photos else ""
    photo_url = f"/api/v1/photos?ref={photo_name}" if photo_name else None

    return {
        "google_place_id": raw.get("id", ""),
        "keyword": keyword,
        "nombre": display_name.get("text", ""),
        "direccion_completa": raw.get("formattedAddress"),
        "telefono": raw.get("nationalPhoneNumber") or raw.get("internationalPhoneNumber"),
        "telefono_internacional": raw.get("internationalPhoneNumber"),
        "sitio_web": raw.get("websiteUri"),
        "calificacion": raw.get("rating"),
        "total_calificaciones": raw.get("userRatingCount"),
        "estado_negocio": raw.get("businessStatus"),
        "nivel_precio": _parse_price_level(raw.get("priceLevel")),
        "tipos": raw.get("types", []),
        "latitud": location.get("latitude"),
        "longitud": location.get("longitude"),
        "pais": addr("country"),
        "provincia": addr("administrative_area_level_1"),
        "localidad": addr("administrative_area_level_2") or addr("locality"),
        "barrio": addr("sublocality_level_1") or addr("neighborhood"),
        "calle": addr("route"),
        "numero": addr("street_number"),
        "codigo_postal": addr("postal_code"),
        "horarios": " | ".join(hours.get("weekdayDescriptions", [])) if hours else None,
        "descripcion": editorial.get("text") if editorial else None,
        "foto_url": photo_url,
        "enlace_maps": raw.get("googleMapsUri"),
        "territorio": territorio,
    }


def _parse_price_level(val: str | None) -> int | None:
    if val is None:
        return None
    mapping = {
        "PRICE_LEVEL_FREE": 0,
        "PRICE_LEVEL_INEXPENSIVE": 1,
        "PRICE_LEVEL_MODERATE": 2,
        "PRICE_LEVEL_EXPENSIVE": 3,
        "PRICE_LEVEL_VERY_EXPENSIVE": 4,
    }
    return mapping.get(val)
