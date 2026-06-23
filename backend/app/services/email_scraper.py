from __future__ import annotations

import asyncio
import re
from collections.abc import Callable
from urllib.parse import urljoin, urlparse

import httpx

EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
)

SKIP_EMAILS = {
    "example.com", "sentry.io", "wixpress.com", "googleapis.com",
    "w3.org", "schema.org", "facebook.com", "twitter.com",
    "instagram.com", "google.com", "wordpress.org", "jquery.com",
}

CONTACT_PATHS = ["/contacto", "/contact", "/about", "/nosotros", "/about-us"]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
}


def _is_valid_email(email: str) -> bool:
    domain = email.split("@")[1].lower()
    if domain in SKIP_EMAILS:
        return False
    if domain.endswith((".png", ".jpg", ".gif", ".svg", ".css", ".js")):
        return False
    if len(email) > 80:
        return False
    return True


def _extract_emails(html: str) -> set[str]:
    raw = EMAIL_RE.findall(html)
    return {e.lower().rstrip(".") for e in raw if _is_valid_email(e)}


async def _fetch_page(client: httpx.AsyncClient, url: str) -> str | None:
    try:
        resp = await client.get(url, headers=HEADERS, follow_redirects=True, timeout=8.0)
        if resp.status_code == 200 and "text/html" in resp.headers.get("content-type", ""):
            return resp.text[:200_000]
    except Exception:
        pass
    return None


async def scrape_email(client: httpx.AsyncClient, website: str) -> str | None:
    if not website:
        return None

    parsed = urlparse(website)
    if not parsed.scheme:
        website = "https://" + website

    html = await _fetch_page(client, website)
    if not html:
        return None

    emails = _extract_emails(html)
    if emails:
        return sorted(emails)[0]

    for path in CONTACT_PATHS:
        sub_url = urljoin(website.rstrip("/") + "/", path.lstrip("/"))
        sub_html = await _fetch_page(client, sub_url)
        if sub_html:
            emails = _extract_emails(sub_html)
            if emails:
                return sorted(emails)[0]

    return None


async def scrape_emails_for_search(
    places: list[dict],
    on_progress: Callable | None = None,
) -> dict[str, str]:
    """Scrape emails for all places with a website. Returns {google_place_id: email}."""
    targets = [
        (i, p) for i, p in enumerate(places)
        if p.get("sitio_web")
    ]
    total = len(targets)
    results: dict[str, str] = {}
    found = 0

    sem = asyncio.Semaphore(5)

    async def process(idx: int, place: dict, client: httpx.AsyncClient):
        nonlocal found
        async with sem:
            email = await scrape_email(client, place["sitio_web"])
            if email:
                results[place["google_place_id"]] = email
                found += 1

    async with httpx.AsyncClient() as client:
        tasks = []
        for i, (orig_idx, place) in enumerate(targets):
            tasks.append(process(orig_idx, place, client))

        completed = 0
        batch_size = 5
        for batch_start in range(0, len(tasks), batch_size):
            batch = tasks[batch_start:batch_start + batch_size]
            await asyncio.gather(*batch)
            completed += len(batch)
            if on_progress:
                await on_progress(completed, total, found)

    return results
