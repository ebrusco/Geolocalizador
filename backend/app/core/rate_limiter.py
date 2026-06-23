import asyncio
import time


class RateLimiter:
    """Async rate limiter: max N concurrent requests with minimum delay between them."""

    def __init__(self, max_concurrent: int = 5, delay_ms: int = 220):
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._delay_s = delay_ms / 1000.0
        self._last_request = 0.0

    async def acquire(self):
        await self._semaphore.acquire()
        now = time.monotonic()
        wait = self._delay_s - (now - self._last_request)
        if wait > 0:
            await asyncio.sleep(wait)
        self._last_request = time.monotonic()

    def release(self):
        self._semaphore.release()

    async def __aenter__(self):
        await self.acquire()
        return self

    async def __aexit__(self, *exc):
        self.release()
