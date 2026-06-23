import { useEffect, useRef } from "react";
import { useSearchStore } from "../stores/searchStore";
import { useAuthStore } from "../stores/authStore";
import { searchStreamUrl } from "../api/searches";
import type { PlaceMarker } from "../types";

export function useSearchSSE(searchId: number | null) {
  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const { updateProgress, addMarker, setCompleted, setFailed } =
    useSearchStore();

  useEffect(() => {
    if (!searchId) return;

    function connect() {
      const token = useAuthStore.getState().token;
      const url = token
        ? `${searchStreamUrl(searchId!)}?token=${encodeURIComponent(token)}`
        : searchStreamUrl(searchId!);

      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener("progress", (e) => {
        try {
          const data = JSON.parse(e.data);
          updateProgress(data.completed_cells, data.total_places);
        } catch { /* malformed SSE data */ }
      });

      es.addEventListener("place_found", (e) => {
        try {
          const place: PlaceMarker = JSON.parse(e.data);
          addMarker(place);
        } catch { /* malformed SSE data */ }
      });

      es.addEventListener("completed", (e) => {
        try {
          const data = JSON.parse(e.data);
          setCompleted(data.total_places);
        } catch {
          setCompleted(0);
        }
        retriesRef.current = 0;
        es.close();
      });

      es.addEventListener("error", (e) => {
        if (e instanceof MessageEvent) {
          try {
            const data = JSON.parse(e.data);
            setFailed(data.detail || "Error desconocido");
          } catch {
            setFailed("Error en la búsqueda");
          }
        }
        retriesRef.current = 0;
        es.close();
      });

      es.onerror = () => {
        es.close();
        const status = useSearchStore.getState().status;
        if (status === "running" && retriesRef.current < 3) {
          retriesRef.current++;
          const delay = 1000 * Math.pow(2, retriesRef.current - 1);
          setTimeout(connect, delay);
        } else if (status === "running") {
          setFailed("Se perdió la conexión con el servidor");
        }
      };
    }

    connect();

    return () => {
      retriesRef.current = 0;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [searchId, updateProgress, addMarker, setCompleted, setFailed]);
}
