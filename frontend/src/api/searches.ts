import api from "./client";
import type { Search, SearchRequest, SearchEstimate, Bounds, GeoJSONPolygon } from "../types";

export interface EstimateParams {
  bounds: Bounds;
  radius_m: number;
  keyword_count: number;
  geojson?: GeoJSONPolygon;
}

export async function estimateSearch(params: EstimateParams): Promise<SearchEstimate> {
  const { data } = await api.post<SearchEstimate>("/searches/estimate", params);
  return data;
}

export async function startSearch(req: SearchRequest): Promise<Search> {
  const { data } = await api.post<Search>("/searches", req);
  return data;
}

export async function getSearch(id: number): Promise<Search> {
  const { data } = await api.get<Search>(`/searches/${id}`);
  return data;
}

export async function listSearches(): Promise<{
  searches: Search[];
  total: number;
}> {
  const { data } = await api.get("/searches");
  return data;
}

export async function cancelSearch(id: number): Promise<void> {
  await api.post(`/searches/${id}/cancel`);
}

export function searchStreamUrl(id: number): string {
  return `/api/v1/searches/${id}/stream`;
}
