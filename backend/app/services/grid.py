import h3
from shapely.geometry import Polygon, mapping

from app.config import settings
from app.core.exceptions import GridTooLargeError
from app.models.territory import Bounds, GridCell

RADIUS_TO_RESOLUTION = [
    (300, 9),
    (700, 8),
    (2000, 7),
]


def radius_to_h3_resolution(radius_m: int) -> int:
    for threshold, resolution in RADIUS_TO_RESOLUTION:
        if radius_m <= threshold:
            return resolution
    return 7


def generate_cells(bounds: Bounds, radius_m: int) -> tuple[int, list[GridCell]]:
    resolution = radius_to_h3_resolution(radius_m)

    polygon = Polygon([
        (bounds.west, bounds.south),
        (bounds.east, bounds.south),
        (bounds.east, bounds.north),
        (bounds.west, bounds.north),
        (bounds.west, bounds.south),
    ])
    geojson = mapping(polygon)

    return _cells_from_geojson(geojson, resolution)


def generate_cells_from_geojson(geojson: dict, radius_m: int) -> tuple[int, list[GridCell]]:
    resolution = radius_to_h3_resolution(radius_m)
    return _cells_from_geojson(geojson, resolution)


def _cells_from_geojson(geojson: dict, resolution: int) -> tuple[int, list[GridCell]]:
    cells = h3.geo_to_cells(geojson, resolution)

    if len(cells) > settings.grid_max_cells:
        raise GridTooLargeError(
            f"{len(cells)} cells exceed max {settings.grid_max_cells}. "
            f"Increase radius or reduce territory size."
        )

    grid_cells = []
    for cell in cells:
        lat, lng = h3.cell_to_latlng(cell)
        grid_cells.append(GridCell(h3_index=cell, lat=lat, lng=lng))

    return resolution, grid_cells
