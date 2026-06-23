import asyncio
from dataclasses import dataclass, field


@dataclass
class SearchProgress:
    total_cells: int = 0
    completed_cells: int = 0
    total_places: int = 0
    status: str = "running"
    queue: asyncio.Queue = field(default_factory=asyncio.Queue)


class ProgressTracker:
    """In-memory tracker for active search jobs. Powers SSE endpoints."""

    def __init__(self):
        self._searches: dict[int, SearchProgress] = {}

    def register(self, search_id: int, total_cells: int) -> SearchProgress:
        progress = SearchProgress(total_cells=total_cells)
        self._searches[search_id] = progress
        return progress

    def get(self, search_id: int) -> SearchProgress | None:
        return self._searches.get(search_id)

    async def emit(self, search_id: int, event_type: str, data: dict):
        progress = self._searches.get(search_id)
        if progress:
            await progress.queue.put({"event": event_type, "data": data})

    async def emit_cell_done(self, search_id: int, new_places: int):
        progress = self._searches.get(search_id)
        if not progress:
            return
        progress.completed_cells += 1
        progress.total_places += new_places
        await self.emit(search_id, "progress", {
            "completed_cells": progress.completed_cells,
            "total_cells": progress.total_cells,
            "total_places": progress.total_places,
        })

    async def emit_place_found(self, search_id: int, place: dict):
        await self.emit(search_id, "place_found", place)

    async def complete(self, search_id: int):
        progress = self._searches.get(search_id)
        if progress:
            progress.status = "completed"
            await self.emit(search_id, "completed", {
                "total_places": progress.total_places,
            })

    async def fail(self, search_id: int, error: str):
        progress = self._searches.get(search_id)
        if progress:
            progress.status = "failed"
            await self.emit(search_id, "error", {"detail": error})

    def cleanup(self, search_id: int):
        self._searches.pop(search_id, None)


tracker = ProgressTracker()
