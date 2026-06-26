from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import Response

from app.config import settings

router = APIRouter()

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=15.0, follow_redirects=True)
    return _client


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
async def auth_proxy(path: str, request: Request) -> Response:
    if not settings.neon_auth_url:
        return Response(content='{"error":"Auth not configured"}', status_code=503, media_type="application/json")

    target_url = f"{settings.neon_auth_url}/{path}"
    if request.url.query:
        target_url += f"?{request.url.query}"

    body = await request.body()

    # Extract the Neon Auth hostname to set as Host header
    neon_host = urlparse(settings.neon_auth_url).netloc

    skip = {"host", "content-length", "transfer-encoding", "connection"}
    forward_headers = {k: v for k, v in request.headers.items() if k.lower() not in skip}
    forward_headers["host"] = neon_host

    client = _get_client()
    resp = await client.request(
        method=request.method,
        url=target_url,
        headers=forward_headers,
        content=body,
    )

    skip_resp = {"transfer-encoding", "content-encoding", "connection"}
    response_headers = {k: v for k, v in resp.headers.items() if k.lower() not in skip_resp}

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=response_headers,
        media_type=resp.headers.get("content-type"),
    )
