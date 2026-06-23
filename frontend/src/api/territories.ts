import api from "./client";
import type { Territory, GridResponse, GeoJSONPolygon } from "../types";

export async function geocodeTerritory(
  query: string,
  radius_m: number,
): Promise<Territory> {
  const { data } = await api.post<Territory>("/territories/geocode", {
    query,
    radius_m,
  });
  return data;
}

export async function polygonTerritory(
  coordinates: number[][],
  radius_m: number,
): Promise<Territory> {
  const { data } = await api.post<Territory>("/territories/polygon", {
    coordinates,
    radius_m,
  });
  return data;
}

export async function getGrid(
  bounds: { north: number; south: number; east: number; west: number },
  radius_m: number,
): Promise<GridResponse> {
  const { data } = await api.post<GridResponse>(
    "/territories/grid",
    bounds,
    { params: { radius_m } },
  );
  return data;
}

export async function getGridPolygon(
  geojson: GeoJSONPolygon,
  radius_m: number,
): Promise<GridResponse> {
  const { data } = await api.post<GridResponse>(
    "/territories/grid-polygon",
    { geojson, radius_m },
  );
  return data;
}
