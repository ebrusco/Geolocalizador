from pydantic import BaseModel

from app.models.territory import Bounds


class EstimateRequest(BaseModel):
    bounds: Bounds
    radius_m: int = 500
    keyword_count: int = 1
    geojson: dict | None = None


class SearchRequest(BaseModel):
    keywords: list[str]
    radius_m: int = 500
    bounds: Bounds
    territorio_nombre: str = ""
    field_mask: str = "basic,contact"
    geojson: dict | None = None


class SearchResponse(BaseModel):
    id: int
    keywords: list[str]
    radius_m: int
    status: str
    total_cells: int
    completed_cells: int
    total_places: int
    started_at: str | None = None
    completed_at: str | None = None
    created_at: str
    territorio_nombre: str | None = None
