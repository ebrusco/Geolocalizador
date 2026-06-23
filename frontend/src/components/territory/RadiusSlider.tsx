import { useRef } from "react";
import { useTerritoryStore } from "../../stores/territoryStore";
import { useUIStore } from "../../stores/uiStore";
import { getGrid, getGridPolygon } from "../../api/territories";

export function RadiusSlider() {
  const { radiusM, setRadius, bounds, setCells } = useTerritoryStore();
  const activeGeo = useTerritoryStore((s) => s.activeGeojson());
  const addToast = useUIStore((s) => s.addToast);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (val: number) => {
    setRadius(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        if (activeGeo) {
          const result = await getGridPolygon(activeGeo, val);
          setCells(result.cells, result.h3_resolution);
        } else if (bounds) {
          const result = await getGrid(bounds, val);
          setCells(result.cells, result.h3_resolution);
        }
      } catch {
        addToast("Error al recalcular grilla", "error");
      }
    }, 300);
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={200}
          max={2000}
          step={100}
          value={radiusM}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="flex-1 accent-[#4285F4] cursor-pointer"
        />
        <span className="text-xs font-semibold text-white bg-[#4285F4] rounded-full px-2.5 py-0.5 min-w-[52px] text-center">
          {radiusM} m
        </span>
      </div>
      <p className="text-xs text-slate-400 mt-1.5">
        Radio más pequeño = más zonas, búsqueda más lenta pero más completa
      </p>
    </div>
  );
}
