import { create } from "zustand";
import type { PlaceMarker } from "../types";

interface SearchState {
  searchId: number | null;
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
  totalCells: number;
  completedCells: number;
  totalPlaces: number;
  markers: PlaceMarker[];
  errorMessage: string | null;

  startSearch: (id: number, totalCells: number) => void;
  updateProgress: (completedCells: number, totalPlaces: number) => void;
  addMarker: (marker: PlaceMarker) => void;
  setCompleted: (totalPlaces: number) => void;
  setFailed: (error: string) => void;
  loadFromHistory: (id: number, totalPlaces: number, markers: PlaceMarker[]) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchId: null,
  status: "idle",
  totalCells: 0,
  completedCells: 0,
  totalPlaces: 0,
  markers: [],
  errorMessage: null,

  startSearch: (id, totalCells) =>
    set({
      searchId: id,
      status: "running",
      totalCells,
      completedCells: 0,
      totalPlaces: 0,
      markers: [],
      errorMessage: null,
    }),

  updateProgress: (completedCells, totalPlaces) =>
    set({ completedCells, totalPlaces }),

  addMarker: (marker) =>
    set((state) => ({ markers: [...state.markers, marker] })),

  setCompleted: (totalPlaces) =>
    set({ status: "completed", totalPlaces }),

  setFailed: (error) => set({ status: "failed", errorMessage: error }),

  loadFromHistory: (id, totalPlaces, markers) =>
    set({
      searchId: id,
      status: "completed",
      totalCells: 0,
      completedCells: 0,
      totalPlaces,
      markers,
      errorMessage: null,
    }),

  reset: () =>
    set({
      searchId: null,
      status: "idle",
      totalCells: 0,
      completedCells: 0,
      totalPlaces: 0,
      markers: [],
      errorMessage: null,
    }),
}));
