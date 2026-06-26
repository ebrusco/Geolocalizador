from pydantic import BaseModel, field_validator


class Bounds(BaseModel):
    north: float
    south: float
    east: float
    west: float


class GeocodeRequest(BaseModel):
    query: str
    radius_m: int = 500


class PolygonRequest(BaseModel):
    coordinates: list[list[float]]
    radius_m: int = 500

    @field_validator("coordinates")
    @classmethod
    def validate_polygon(cls, v: list[list[float]]) -> list[list[float]]:
        if len(v) < 3:
            raise ValueError("Un polígono necesita al menos 3 puntos")
        return v


class GridCell(BaseModel):
    h3_index: str
    lat: float
    lng: float


class TerritoryResponse(BaseModel):
    id: int
    nombre: str
    bounds: Bounds
    area_km2: float
    h3_resolution: int
    h3_cell_count: int
    cells: list[GridCell]
    created_at: str


class GridResponse(BaseModel):
    h3_resolution: int
    h3_cell_count: int
    cells: list[GridCell]


class GridFromPolygonRequest(BaseModel):
    geojson: dict
    radius_m: int = 500
