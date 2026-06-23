import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.config import settings

router = APIRouter()

_client: httpx.AsyncClient | None = None


async def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=10.0)
    return _client


@router.get("/photos")
async def photo_proxy(ref: str = Query(..., min_length=5)):
    if not ref.startswith("places/"):
        raise HTTPException(400, "Referencia de foto inválida")

    url = (
        f"https://places.googleapis.com/v1/{ref}/media"
        f"?maxWidthPx=400&key={settings.google_api_key}"
    )
    client = await _get_client()
    try:
        resp = await client.get(url, follow_redirects=True)
    except httpx.HTTPError:
        raise HTTPException(502, "Error obteniendo foto")

    if resp.status_code != 200:
        raise HTTPException(resp.status_code, "Foto no disponible")

    content_type = resp.headers.get("content-type", "image/jpeg")
    return Response(
        content=resp.content,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )
