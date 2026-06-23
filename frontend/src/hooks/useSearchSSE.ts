import { useEffect, useRef } from "react";
import { useSearchStore } from "../stores/searchStore";
import { searchStreamUrl } from "../api/searches";
import type { PlaceMarker } from "../types";

export function useSearchSSE(searchId: number | null) {
  const esRef = useRef<EventSource | null>(null);
  const { updateProgress, addMarker, setCompleted, setFailed } =
    useSearchStore();

  useEffect(() => {
    if (!searchId) return;

    const es = new EventSource(searchStreamUrl(searchId));
    esRef.current = es;

    es.addEventListener("progress", (e) => {
      const data = JSON.parse(e.data);
      updateProgress(data.completed_cells, data.total_places);
    });

    es.addEventListener("place_found", (e) => {
      const place: PlaceMarker = JSON.parse(e.data);
      addMarker(place);
    });

    es.addEventListener("completed", (e) => {
      const data = JSON.parse(e.data);
      setCompleted(data.total_places);
      es.close();
    });

    es.addEventListener("error", (e) => {
      if (e instanceof MessageEvent) {
        const data = JSON.parse(e.data);
        setFailed(data.detail);
      }
      es.close();
    });

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [searchId, updateProgress, addMarker, setCompleted, setFailed]);
}
