import { create } from "zustand";

type DrawMode = "polygon" | "rectangle" | "circle";

interface DrawingState {
  drawMode: DrawMode;
  setDrawMode: (m: DrawMode) => void;
}

export const useDrawingStore = create<DrawingState>((set) => ({
  drawMode: "polygon",
  setDrawMode: (m) => set({ drawMode: m }),
}));
