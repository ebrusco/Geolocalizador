from shapely.geometry import Polygon, shape

from app.models.territory import Bounds
from app.services.geocoding_client import geocode
from app.services.nominatim_client import get_polygon
from app.services.grid import generate_cells, generate_cells_from_geojson, radius_to_h3_resolution


async def geocode_and_grid(query: str, radius_m: int):
    nombre, bounds, center = await geocode(query)

    nominatim = await get_polygon(query)

    if nominatim and nominatim["geojson"]:
        geojson = nominatim["geojson"]
        resolution, cells = generate_cells_from_geojson(geojson, radius_m)
        polygon_coords = nominatim["polygon"]
        shp = shape(geojson)
        area_km2 = _calc_area_from_shape(shp)
        if nominatim["bounds"]:
            bounds = Bounds(**nominatim["bounds"])
    else:
        resolution, cells = generate_cells(bounds, radius_m)
        polygon_coords = None
        area_km2 = _calc_area_km2(bounds)

    return {
        "nombre": nombre,
        "bounds": bounds,
        "center": center,
        "area_km2": area_km2,
        "h3_resolution": resolution,
        "h3_cell_count": len(cells),
        "cells": cells,
        "polygon": polygon_coords,
        "geojson": nominatim["geojson"] if nominatim else None,
    }


def polygon_and_grid(coordinates: list[list[float]], radius_m: int):
    lats = [c[0] for c in coordinates]
    lngs = [c[1] for c in coordinates]
    bounds = Bounds(
        north=max(lats), south=min(lats),
        east=max(lngs), west=min(lngs),
    )

    geojson = {
        "type": "Polygon",
        "coordinates": [[[lng, lat] for lat, lng in coordinates]],
    }
    if geojson["coordinates"][0][0] != geojson["coordinates"][0][-1]:
        geojson["coordinates"][0].append(geojson["coordinates"][0][0])

    resolution, cells = generate_cells_from_geojson(geojson, radius_m)
    shp = shape(geojson)
    area_km2 = _calc_area_from_shape(shp)

    return {
        "nombre": "Zona dibujada",
        "bounds": bounds,
        "area_km2": area_km2,
        "h3_resolution": resolution,
        "h3_cell_count": len(cells),
        "cells": cells,
        "polygon": coordinates,
        "geojson": geojson,
    }


def recalc_grid_polygon(geojson: dict, radius_m: int):
    resolution, cells = generate_cells_from_geojson(geojson, radius_m)
    return {
        "h3_resolution": resolution,
        "h3_cell_count": len(cells),
        "cells": cells,
    }


def recalc_grid(bounds: Bounds, radius_m: int):
    resolution, cells = generate_cells(bounds, radius_m)
    return {
        "h3_resolution": resolution,
        "h3_cell_count": len(cells),
        "cells": cells,
    }


def _calc_area_from_shape(shp) -> float:
    import math
    centroid = shp.centroid
    lat_scale = 111320
    lng_scale = 111320 * math.cos(math.radians(centroid.y))
    area_m2 = shp.area * lat_scale * lng_scale
    return round(area_m2 / 1_000_000, 1)


def _calc_area_km2(bounds: Bounds) -> float:
    import math
    lat_diff = bounds.north - bounds.south
    lng_diff = bounds.east - bounds.west
    mid_lat = (bounds.north + bounds.south) / 2
    km2 = (lat_diff * 111.32) * (lng_diff * 111.32 * math.cos(math.radians(mid_lat)))
    return round(abs(km2), 1)
