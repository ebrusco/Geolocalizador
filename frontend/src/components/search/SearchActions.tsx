import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useTerritoryStore } from "../../stores/territoryStore";
import { useSearchStore } from "../../stores/searchStore";
import { useUIStore } from "../../stores/uiStore";
import { startSearch, cancelSearch, estimateSearch } from "../../api/searches";
import { CostConfirmModal } from "./CostConfirmModal";
import type { SearchEstimate } from "../../types";

interface Props {
  keywords: string[];
}

export function SearchActions({ keywords }: Props) {
  const { bounds, nombre, radiusM, cells } = useTerritoryStore();
  const activeGeo = useTerritoryStore((s) => s.activeGeojson());
  const { status, searchId, startSearch: storeStart, reset } = useSearchStore();
  const addToast = useUIStore((s) => s.addToast);
  const [estimate, setEstimate] = useState<SearchEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState(nombre);

  useEffect(() => {
    setSearchName(nombre);
  }, [nombre]);

  const canStart = bounds && keywords.length > 0 && status !== "running";

  const handleStart = async () => {
    if (!bounds || keywords.length === 0) {
      addToast("Seleccioná un territorio y al menos una palabra clave.", "error");
      return;
    }

    setLoading(true);
    try {
      const est = await estimateSearch({
        bounds,
        radius_m: radiusM,
        keyword_count: keywords.length,
        geojson: activeGeo ?? undefined,
      });

      setEstimate(est);
    } catch {
      addToast("Error al estimar la búsqueda.", "error");
    } finally {
      setLoading(false);
    }
  };

  const executeSearch = async () => {
    if (!bounds) return;
    setEstimate(null);
    reset();

    try {
      const search = await startSearch({
        keywords,
        radius_m: radiusM,
        bounds,
        territorio_nombre: searchName || nombre,
        geojson: activeGeo ?? undefined,
      });
      storeStart(search.id, search.total_cells || cells.length * keywords.length);
      addToast(`Búsqueda iniciada: ${keywords.length} keywords × ${cells.length} zonas`, "ok");
    } catch {
      addToast("Error al iniciar la búsqueda.", "error");
    }
  };

  const handleCancel = async () => {
    if (!searchId) return;
    try {
      await cancelSearch(searchId);
      addToast("Búsqueda cancelada.", "info");
    } catch {
      addToast("Error al cancelar.", "error");
    }
  };

  return (
    <>
      {bounds && (
        <input
          type="text"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="Nombre del análisis..."
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700
                     placeholder:text-slate-400 bg-white outline-none focus:border-[#4285F4]
                     focus:ring-1 focus:ring-[#4285F4] transition-colors"
        />
      )}
      {status === "running" ? (
        <button
          onClick={handleCancel}
          className="w-full flex items-center justify-center gap-2 bg-[#EA4335] text-white border-none
                     rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer hover:bg-[#d33426]
                     transition-colors"
        >
          <X size={16} />
          Cancelar búsqueda
        </button>
      ) : (
        <button
          onClick={handleStart}
          disabled={!canStart || loading}
          className="w-full flex items-center justify-center gap-2 bg-[#4285F4] text-white border-none
                     rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer hover:bg-[#3367D6]
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Search size={16} />
          {loading ? "Estimando..." : "Iniciar búsqueda"}
        </button>
      )}

      {estimate && (
        <CostConfirmModal
          estimate={estimate}
          territorio={searchName || nombre}
          keywords={keywords.length}
          onConfirm={executeSearch}
          onCancel={() => setEstimate(null)}
        />
      )}
    </>
  );
}
