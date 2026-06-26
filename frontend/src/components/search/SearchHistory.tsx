import { useEffect, useState } from "react";
import {
  CheckCircle2, Loader2, XCircle, Ban, Clock, Download,
  MapPin, Mail, Bookmark, BookmarkCheck, X, Pin,
} from "lucide-react";
import { listSearches, getSearch, getSearchResults, pinSearch, unpinSearch } from "../../api/searches";
import { getGridPolygon } from "../../api/territories";
import { downloadExport } from "../../api/exports";
import { useUIStore } from "../../stores/uiStore";
import { useSearchStore } from "../../stores/searchStore";
import { useTerritoryStore } from "../../stores/territoryStore";
import type { Search, PlaceMarker } from "../../types";

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  completed: { icon: <CheckCircle2 size={13} />, color: "text-[#34A853]" },
  running:   { icon: <Loader2 size={13} className="animate-spin" />, color: "text-[#4285F4]" },
  failed:    { icon: <XCircle size={13} />, color: "text-[#EA4335]" },
  cancelled: { icon: <Ban size={13} />, color: "text-[#FBBC04]" },
  pending:   { icon: <Clock size={13} />, color: "text-slate-400" },
};

export function SearchHistory() {
  const [searches, setSearches] = useState<Search[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  // Pin flow
  const [pinningId, setPinningId] = useState<number | null>(null);
  const [pinName, setPinName] = useState("");
  const [savingPin, setSavingPin] = useState(false);

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

      let cells: import("../../types").GridCell[] = [];
      let h3Resolution = 8;
      try {
        const grid = await getGridPolygon(detail.geojson, detail.radius_m);
        cells = grid.cells;
        h3Resolution = grid.h3_resolution;
      } catch { /* non-fatal */ }

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

      useSearchStore.getState().loadFromHistory(s.id, markers.length, markers, detail.total_cells);
      const label = detail.custom_name || detail.territorio_nombre || `Búsqueda #${s.id}`;
      addToast(`"${label}" cargado en el mapa`, "ok");
    } catch {
      addToast("Error al cargar el análisis", "error");
    } finally {
      setLoadingId(null);
    }
  };

  const startPin = (s: Search) => {
    setPinningId(s.id);
    setPinName(s.custom_name || s.territorio_nombre || "");
  };

  const confirmPin = async () => {
    if (!pinningId || !pinName.trim()) return;
    setSavingPin(true);
    try {
      await pinSearch(pinningId, pinName.trim());
      await load();
      addToast(`"${pinName.trim()}" guardado`, "ok");
    } catch {
      addToast("Error al guardar", "error");
    } finally {
      setSavingPin(false);
      setPinningId(null);
      setPinName("");
    }
  };

  const handleUnpin = async (s: Search) => {
    try {
      await unpinSearch(s.id);
      await load();
      addToast(`"${s.custom_name}" eliminado de guardados`, "info");
    } catch {
      addToast("Error al eliminar", "error");
    }
  };

  if (loading) return <p className="text-xs text-slate-400">Cargando...</p>;
  if (searches.length === 0)
    return <p className="text-xs text-slate-400 italic">Sin búsquedas previas</p>;

  const pinned = searches.filter((s) => s.pinned);
  const history = searches.filter((s) => !s.pinned);

  return (
    <div className="flex flex-col gap-0">
      {/* ── Guardados ── */}
      {pinned.length > 0 && (
        <div className="mb-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
            <Pin size={12} />
            Guardados
          </p>
          <div className="flex flex-col gap-1">
            {pinned.map((s) => {
              const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
              const isLoading = loadingId === s.id;
              const canLoad = s.status === "completed" && s.total_places > 0;
              const emailsFound = localStorage.getItem(`emails_${s.id}`);
              return (
                <div
                  key={s.id}
                  className="rounded-lg border border-[#4285F4]/20 bg-[#E8F0FE]/40 px-2.5 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {s.custom_name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {s.territorio_nombre} · {s.total_places} resultados
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {emailsFound !== null && (
                        <span className="flex items-center gap-0.5 text-[10px] text-[#34A853] bg-green-50 px-1.5 py-0.5 rounded-full font-medium">
                          <Mail size={9} />
                          {emailsFound}
                        </span>
                      )}
                      <span className={cfg.color}>{cfg.icon}</span>
                      <button
                        onClick={() => handleUnpin(s)}
                        title="Quitar de guardados"
                        className="text-slate-300 hover:text-[#EA4335] cursor-pointer bg-transparent border-none p-0.5 flex items-center transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {s.keywords.join(", ")}
                  </p>
                  {canLoad && (
                    <div className="flex items-center gap-3 mt-1.5">
                      <button
                        onClick={() => handleLoad(s)}
                        disabled={isLoading || loadingId !== null}
                        className="inline-flex items-center gap-1 text-xs text-[#4285F4] hover:text-[#3367D6]
                                   transition-colors cursor-pointer bg-transparent border-none p-0 disabled:opacity-40"
                      >
                        {isLoading ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                        {isLoading ? "Cargando..." : "Ver en mapa"}
                      </button>
                      <button
                        onClick={async () => {
                          try { await downloadExport(s.id); }
                          catch { addToast("Error al descargar", "error"); }
                        }}
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600
                                   transition-colors cursor-pointer bg-transparent border-none p-0"
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
        </div>
      )}

      {/* ── Historial ── */}
      {history.length > 0 && (
        <div>
          {pinned.length > 0 && (
            <p className="text-xs font-medium text-slate-500 mb-2">Recientes</p>
          )}
          <div className="flex flex-col gap-0.5">
            {history.map((s) => {
              const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
              const isLoading = loadingId === s.id;
              const canLoad = s.status === "completed" && s.total_places > 0;
              const emailsFound = localStorage.getItem(`emails_${s.id}`);
              const isPinning = pinningId === s.id;

              return (
                <div key={s.id} className="rounded-lg hover:bg-slate-50 transition-colors group">
                  {isPinning ? (
                    /* Inline pin name input */
                    <div className="px-2.5 py-2 space-y-1.5">
                      <p className="text-xs text-slate-500">Nombre para guardar:</p>
                      <input
                        type="text"
                        value={pinName}
                        onChange={(e) => setPinName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") confirmPin(); if (e.key === "Escape") setPinningId(null); }}
                        placeholder="Ej: Bernal electrónica Q2..."
                        autoFocus
                        className="w-full border border-[#4285F4]/40 rounded-lg px-2.5 py-1.5 text-xs
                                   text-slate-700 placeholder:text-slate-400 bg-white outline-none
                                   focus:border-[#4285F4] focus:ring-1 focus:ring-[#4285F4] transition-colors"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={confirmPin}
                          disabled={savingPin || !pinName.trim()}
                          className="flex items-center gap-1 text-xs bg-[#4285F4] text-white px-3 py-1
                                     rounded-lg cursor-pointer hover:bg-[#3367D6] disabled:opacity-40
                                     border-none transition-colors"
                        >
                          {savingPin ? <Loader2 size={11} className="animate-spin" /> : <BookmarkCheck size={11} />}
                          Guardar
                        </button>
                        <button
                          onClick={() => { setPinningId(null); setPinName(""); }}
                          className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-2.5 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700 truncate flex-1 min-w-0 mr-2">
                          {s.territorio_nombre || `Búsqueda #${s.id}`}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {emailsFound !== null && (
                            <span className="flex items-center gap-0.5 text-[10px] text-[#34A853] bg-green-50 px-1.5 py-0.5 rounded-full font-medium">
                              <Mail size={9} />
                              {emailsFound}
                            </span>
                          )}
                          {canLoad && (
                            <button
                              onClick={() => startPin(s)}
                              title="Guardar en mis análisis"
                              className="text-slate-300 hover:text-[#4285F4] cursor-pointer bg-transparent
                                         border-none p-0.5 flex items-center transition-colors
                                         opacity-0 group-hover:opacity-100"
                            >
                              <Bookmark size={13} />
                            </button>
                          )}
                          <span className={cfg.color}>{cfg.icon}</span>
                        </div>
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
                                       transition-colors cursor-pointer bg-transparent border-none p-0 disabled:opacity-40"
                          >
                            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
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
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
