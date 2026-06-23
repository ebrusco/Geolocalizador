import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { geocodeTerritory } from "../../api/territories";
import { useTerritoryStore } from "../../stores/territoryStore";
import { useUIStore } from "../../stores/uiStore";

export function TerritoryInput() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { setTerritory, radiusM } = useTerritoryStore();
  const addToast = useUIStore((s) => s.addToast);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) {
      addToast("Ingresá un municipio o código postal.", "error");
      return;
    }
    setLoading(true);
    try {
      const result = await geocodeTerritory(q, radiusM);
      setTerritory({
        id: result.id,
        nombre: result.nombre,
        bounds: result.bounds,
        areaKm2: result.area_km2,
        h3Resolution: result.h3_resolution,
        cells: result.cells,
        polygon: result.polygon ?? null,
        geojson: result.geojson ?? null,
      });
      addToast(
        `Territorio: ${result.nombre} · ${result.h3_cell_count} zonas`,
        "ok",
      );
    } catch {
      addToast("No se encontró el territorio.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        placeholder="Buscar municipio o código postal..."
        className="w-full rounded-full pl-9 pr-4 py-2.5 text-sm border border-slate-200
                   bg-white outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/10
                   placeholder:text-slate-400"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
      />
    </div>
  );
}
