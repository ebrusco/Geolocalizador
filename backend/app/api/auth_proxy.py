import httpx
from fastapi import APIRouter, Request
from fastapi.responses import Response

from app.config import settings

router = APIRouter()

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=15.0)
    return _client


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
async def auth_proxy(path: str, request: Request) -> Response:
    if not settings.neon_auth_url:
        return Response(content='{"error":"Auth not configured"}', status_code=503, media_type="application/json")

    target_url = f"{settings.neon_auth_url}/{path}"
    if request.url.query:
        target_url += f"?{request.url.query}"

    body = await request.body()

    forward_headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in ("host", "content-length", "transfer-encoding")
    }

    client = _get_client()
    resp = await client.request(
        method=request.method,
        url=target_url,
        headers=forward_headers,
        content=body,
    )

    excluded = {"transfer-encoding", "content-encoding"}
    response_headers = {k: v for k, v in resp.headers.items() if k.lower() not in excluded}

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=response_headers,
        media_type=resp.headers.get("content-type"),
    )
