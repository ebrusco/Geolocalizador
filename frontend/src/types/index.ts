export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GridCell {
  h3_index: string;
  lat: number;
  lng: number;
}

export interface Territory {
  id: number;
  nombre: string;
  bounds: Bounds;
  area_km2: number;
  h3_resolution: number;
  h3_cell_count: number;
  cells: GridCell[];
  polygon?: [number, number][];
  geojson?: GeoJSONPolygon;
  created_at: string;
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface GridResponse {
  h3_resolution: number;
  h3_cell_count: number;
  cells: GridCell[];
}

export interface SearchRequest {
  keywords: string[];
  radius_m: number;
  bounds: Bounds;
  territorio_nombre: string;
  field_mask?: string;
  geojson?: GeoJSONPolygon;
}

export interface Search {
  id: number;
  keywords: string[];
  radius_m: number;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  total_cells: number;
  completed_cells: number;
  total_places: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  territorio_nombre?: string;
}

export interface PlaceMarker {
  nombre: string;
  keyword: string;
  latitud: number;
  longitud: number;
  calificacion: number | null;
  direccion_completa: string | null;
  enlace_maps: string | null;
}

export interface Place {
  id: number;
  google_place_id: string;
  keyword: string;
  nombre: string | null;
  direccion_completa: string | null;
  telefono: string | null;
  sitio_web: string | null;
  calificacion: number | null;
  total_calificaciones: number | null;
  estado_negocio: string | null;
  nivel_precio: number | null;
  tipos: string[] | null;
  latitud: number | null;
  longitud: number | null;
  pais: string | null;
  provincia: string | null;
  localidad: string | null;
  barrio: string | null;
  calle: string | null;
  numero: string | null;
  codigo_postal: string | null;
  horarios: string | null;
  descripcion: string | null;
  foto_url: string | null;
  enlace_maps: string | null;
}

export interface KeywordProfile {
  id: number;
  nombre: string;
  keywords: string[];
}

export interface SearchEstimate {
  total_cells: number;
  total_api_calls: number;
  estimated_cost_usd: number;
  real_cost_usd: number;
  free_calls_remaining: number;
  covered_by_free: number;
  paid_calls: number;
  level: "green" | "yellow" | "red";
}

export interface UsageSummary {
  calls_today: number;
  cost_today_usd: number;
  calls_month: number;
  cost_month_usd: number;
  free_credit_total_usd: number;
  free_credit_remaining_usd: number;
  free_credit_pct: number;
  free_calls_remaining: number;
  free_calls_total: number;
  is_free_exhausted: boolean;
  real_cost_usd: number;
  cost_per_call_usd: number;
}
