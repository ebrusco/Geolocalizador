import api from "./client";
import type { Territory, GridResponse, GeoJSONPolygon } from "../types";

export interface TerritorySuggestion {
  place_id: string;
  main_text: string;
  secondary_text: string;
}

export async function autocompleteTerritory(
  query: string,
): Promise<TerritorySuggestion[]> {
  const { data } = await api.get<{ suggestions: TerritorySuggestion[] }>(
    "/territories/autocomplete",
    { params: { q: query } },
  );
  return data.suggestions;
}

export async function geocodeTerritoryByPlaceId(
  placeId: string,
  radius_m: number,
): Promise<Territory> {
  const { data } = await api.post<Territory>("/territories/geocode-place", {
    place_id: placeId,
    radius_m,
  });
  return data;
}

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
