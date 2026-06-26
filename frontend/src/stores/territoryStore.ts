import { create } from "zustand";
import type { Bounds, GridCell, GeoJSONPolygon } from "../types";

type TerritoryMode = "locality" | "draw";

interface TerritoryState {
  mode: TerritoryMode;
  id: number | null;
  nombre: string;
  bounds: Bounds | null;
  areaKm2: number | null;
  h3Resolution: number | null;
  cells: GridCell[];
  radiusM: number;
  polygon: [number, number][] | null;
  geojson: GeoJSONPolygon | null;

  // Refinement: sub-area drawn within the locality
  isRefining: boolean;
  refinedPolygon: [number, number][] | null;
  refinedGeojson: GeoJSONPolygon | null;

  setMode: (m: TerritoryMode) => void;
  loadFromSearch: (t: {
    nombre: string;
    bounds: Bounds;
    geojson: GeoJSONPolygon;
    polygon: [number, number][];
    radiusM: number;
    cells: GridCell[];
    h3Resolution: number;
  }) => void;
  setTerritory: (t: {
    id: number;
    nombre: string;
    bounds: Bounds;
    areaKm2: number;
    h3Resolution: number;
    cells: GridCell[];
    polygon?: [number, number][] | null;
    geojson?: GeoJSONPolygon | null;
  }) => void;
  setCells: (cells: GridCell[], resolution: number) => void;
  setRadius: (r: number) => void;
  setRefining: (v: boolean) => void;
  setRefinement: (polygon: [number, number][], geojson: GeoJSONPolygon, cells: GridCell[], resolution: number, bounds: Bounds, areaKm2: number) => void;
  clearRefinement: () => void;
  clear: () => void;

  // Computed: the active geojson for searching (refined or full)
  activeGeojson: () => GeoJSONPolygon | null;
}

export const useTerritoryStore = create<TerritoryState>((set, get) => ({
  mode: "locality",
  id: null,
  nombre: "",
  bounds: null,
  areaKm2: null,
  h3Resolution: null,
  cells: [],
  radiusM: 500,
  polygon: null,
  geojson: null,
  isRefining: false,
  refinedPolygon: null,
  refinedGeojson: null,

  setMode: (m) => set({ mode: m }),

  loadFromSearch: (t) =>
    set({
      nombre: t.nombre,
      bounds: t.bounds,
      geojson: t.geojson,
      polygon: t.polygon,
      radiusM: t.radiusM,
      cells: t.cells,
      h3Resolution: t.h3Resolution,
      id: null,
      areaKm2: null,
      isRefining: false,
      refinedPolygon: null,
      refinedGeojson: null,
    }),

  setTerritory: (t) =>
    set({
      id: t.id,
      nombre: t.nombre,
      bounds: t.bounds,
      areaKm2: t.areaKm2,
      h3Resolution: t.h3Resolution,
      cells: t.cells,
      polygon: t.polygon ?? null,
      geojson: t.geojson ?? null,
      isRefining: false,
      refinedPolygon: null,
      refinedGeojson: null,
    }),

  setCells: (cells, resolution) =>
    set({ cells, h3Resolution: resolution }),

  setRadius: (r) => set({ radiusM: r }),

  setRefining: (v) => set({ isRefining: v }),

  setRefinement: (polygon, geojson, cells, resolution, bounds, areaKm2) =>
    set({
      refinedPolygon: polygon,
      refinedGeojson: geojson,
      cells,
      h3Resolution: resolution,
      bounds,
      areaKm2,
      isRefining: false,
    }),

  clearRefinement: () => {
    set({
      refinedPolygon: null,
      refinedGeojson: null,
      isRefining: false,
    });
    // Will need to re-fetch cells for full polygon via RadiusSlider
  },

  clear: () =>
    set({
      id: null,
      nombre: "",
      bounds: null,
      areaKm2: null,
      h3Resolution: null,
      cells: [],
      polygon: null,
      geojson: null,
      isRefining: false,
      refinedPolygon: null,
      refinedGeojson: null,
    }),

  activeGeojson: () => {
    const state = get();
    return state.refinedGeojson ?? state.geojson ?? null;
  },
}));
