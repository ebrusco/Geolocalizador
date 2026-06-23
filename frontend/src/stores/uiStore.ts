import { create } from "zustand";

interface Toast {
  id: number;
  message: string;
  type: "info" | "ok" | "error";
}

interface UIState {
  historyOpen: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  toasts: Toast[];
  toggleHistory: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  addToast: (message: string, type?: "info" | "ok" | "error") => void;
  removeToast: (id: number) => void;
}

let toastId = 0;

export const useUIStore = create<UIState>((set) => ({
  historyOpen: false,
  leftPanelOpen: true,
  rightPanelOpen: true,
  toasts: [],

  toggleHistory: () =>
    set((state) => ({ historyOpen: !state.historyOpen })),

  toggleLeftPanel: () =>
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),

  toggleRightPanel: () =>
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

  addToast: (message, type = "info") => {
    const id = ++toastId;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
