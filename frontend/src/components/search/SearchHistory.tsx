import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle, Ban, Clock, Download, MapPin } from "lucide-react";
import { listSearches, getSearch, getSearchResults } from "../../api/searches";
import { getGridPolygon } from "../../api/territories";
import { downloadExport } from "../../api/exports";
import { useUIStore } from "../../stores/uiStore";
import { useSearchStore } from "../../stores/searchStore";
import { useTerritoryStore } from "../../stores/territoryStore";
import type { Search, PlaceMarker } from "../../types";

export function SearchHistory() {
  const [searches, setSearches] = useState<Search[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  const load = async () => {
    try {
      const data = await listSearches();
      setSearches(data.searches);
    } catch {
      addToast("Error al cargar historial", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLoad = async (s: Search) => {
    setLoadingId(s.id);
    try {
      const detail = await getSearch(s.id);
      if (!detail.geojson || !detail.bounds) {
        addToast("No hay datos de zona guardados para esta búsqueda", "error");
        return;
      }

      const rawPlaces = await getSearchResults(s.id);

      // Regenerate H3 grid so user can re-search from this territory
      let cells: import("../../types").GridCell[] = [];
      let h3Resolution = 8;
      try {
        const grid = await getGridPolygon(detail.geojson, detail.radius_m);
        cells = grid.cells;
        h3Resolution = grid.h3_resolution;
      } catch { /* non-fatal */ }

      // GeoJSON uses [lng, lat]; territoryStore.polygon uses [lat, lng]
      const polygon = detail.geojson.coordinates[0].map(
        ([lng, lat]) => [lat, lng] as [number, number],
      );

      useTerritoryStore.getState().loadFromSearch({
        nombre: detail.territorio_nombre || `Búsqueda #${detail.id}`,
        bounds: detail.bounds,
        geojson: detail.geojson,
        polygon,
        radiusM: detail.radius_m,
        cells,
        h3Resolution,
      });

      const markers: PlaceMarker[] = rawPlaces
        .filter((p) => p.latitud && p.longitud)
        .map((p) => ({
          nombre: (p as any).nombre || "",
          keyword: (p as any).keyword || "",
          latitud: (p as any).latitud,
          longitud: (p as any).longitud,
          calificacion: (p as any).calificacion ?? null,
          direccion_completa: (p as any).direccion_completa ?? null,
          enlace_maps: (p as any).enlace_maps ?? null,
        }));

      useSearchStore.getState().loadFromHistory(s.id, markers.length, markers);
      addToast(`"${detail.territorio_nombre || `Búsqueda #${s.id}`}" cargado en el mapa`, "ok");
    } catch {
      addToast("Error al cargar el análisis", "error");
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) return <p className="text-xs text-slate-400">Cargando...</p>;
  if (searches.length === 0)
    return <p className="text-xs text-slate-400 italic">Sin búsquedas previas</p>;

  const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    completed: { icon: <CheckCircle2 size={14} />, color: "text-[#34A853]" },
    running: { icon: <Loader2 size={14} className="animate-spin" />, color: "text-[#4285F4]" },
    failed: { icon: <XCircle size={14} />, color: "text-[#EA4335]" },
    cancelled: { icon: <Ban size={14} />, color: "text-[#FBBC04]" },
    pending: { icon: <Clock size={14} />, color: "text-slate-400" },
  };

  return (
    <div className="flex flex-col gap-1">
      {searches.map((s) => {
        const cfg = statusConfig[s.status] || statusConfig.pending;
        const isLoading = loadingId === s.id;
        const canLoad = s.status === "completed" && s.total_places > 0;
        return (
          <div key={s.id} className="rounded-lg px-2.5 py-2 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 truncate flex-1 min-w-0 mr-2">
                {s.territorio_nombre || `Búsqueda #${s.id}`}
              </span>
              <span className={cfg.color + " flex-shrink-0"}>{cfg.icon}</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 truncate">
              {s.keywords.join(", ")} · {s.total_places} resultados
            </div>
            {canLoad && (
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  onClick={() => handleLoad(s)}
                  disabled={isLoading || loadingId !== null}
                  className="inline-flex items-center gap-1 text-xs text-[#4285F4] hover:text-[#3367D6]
                             transition-colors cursor-pointer bg-transparent border-none p-0
                             disabled:opacity-40"
                >
                  {isLoading
                    ? <Loader2 size={12} className="animate-spin" />
                    : <MapPin size={12} />}
                  {isLoading ? "Cargando..." : "Ver en mapa"}
                </button>
                <button
                  onClick={async () => {
                    try { await downloadExport(s.id); }
                    catch { addToast("Error al descargar", "error"); }
                  }}
                  className="inline-flex items-center gap-1 text-xs text-slate-400
                             hover:text-slate-600 transition-colors cursor-pointer
                             bg-transparent border-none p-0"
                >
                  <Download size={12} />
                  Descargar
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
