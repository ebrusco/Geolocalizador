import { useState } from "react";
import { AlertTriangle, ArrowDownCircle } from "lucide-react";
import { useTerritoryStore } from "../../stores/territoryStore";
import { useUIStore } from "../../stores/uiStore";
import { getGridPolygon, getGrid } from "../../api/territories";
import { estimateSearch } from "../../api/searches";

const H3_CELL_AREA_KM2: Record<number, number> = {
  7: 5.161,
  8: 0.737,
  9: 0.105,
  10: 0.015,
};

const RADIUS_STEPS = [200, 300, 400, 500, 700, 1000, 1500, 2000];

function getCoverage(cellCount: number, resolution: number | null, areaKm2: number | null): number | null {
  if (!resolution || !areaKm2 || areaKm2 === 0) return null;
  if (cellCount === 0) return 0;
  const cellArea = H3_CELL_AREA_KM2[resolution];
  if (!cellArea) return null;
  const idealCells = Math.ceil(areaKm2 / cellArea);
  if (idealCells <= 0) return 1;
  return Math.min(cellCount / idealCells, 1.0);
}

function getSuggestedRadius(currentRadius: number, coverage: number | null): number | null {
  if (coverage === null || coverage >= 0.6) return null;
  const smaller = RADIUS_STEPS.filter((r) => r < currentRadius);
  if (smaller.length === 0) return null;
  return smaller[smaller.length - 1];
}

export function CoverageInfo() {
  const { cells, h3Resolution, areaKm2, radiusM, bounds, setRadius, setCells } = useTerritoryStore();
  const activeGeo = useTerritoryStore((s) => s.activeGeojson());
  const addToast = useUIStore((s) => s.addToast);
  const [showConfirm, setShowConfirm] = useState(false);
  const [adjustEstimate, setAdjustEstimate] = useState<{
    newRadius: number;
    newCells: number;
    costUsd: number;
    realCostUsd: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const coverage = getCoverage(cells.length, h3Resolution, areaKm2);
  if (coverage === null) return null;

  const pct = Math.round(coverage * 100);
  const isLow = pct < 60;
  const isMedium = pct >= 60 && pct < 80;

  const barColor = isLow ? "bg-[#EA4335]" : isMedium ? "bg-[#FBBC04]" : "bg-[#34A853]";
  const textColor = isLow ? "text-[#EA4335]" : isMedium ? "text-[#FBBC04]" : "text-[#34A853]";
  const suggestedRadius = getSuggestedRadius(radiusM, coverage);

  const handleSuggestAdjust = async () => {
    if (!suggestedRadius) return;
    setLoading(true);
    try {
      let result;
      if (activeGeo) {
        result = await getGridPolygon(activeGeo, suggestedRadius);
      } else if (bounds) {
        result = await getGrid(bounds, suggestedRadius);
      } else {
        return;
      }

      const est = await estimateSearch({
        bounds: bounds!,
        radius_m: suggestedRadius,
        keyword_count: 1,
        geojson: activeGeo ?? undefined,
      });

      setAdjustEstimate({
        newRadius: suggestedRadius,
        newCells: result.h3_cell_count,
        costUsd: est.estimated_cost_usd,
        realCostUsd: est.real_cost_usd,
      });
      setShowConfirm(true);
    } catch {
      addToast("Error al calcular ajuste.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAdjust = async () => {
    if (!adjustEstimate) return;
    setShowConfirm(false);
    setLoading(true);
    try {
      let result;
      if (activeGeo) {
        result = await getGridPolygon(activeGeo, adjustEstimate.newRadius);
      } else if (bounds) {
        result = await getGrid(bounds, adjustEstimate.newRadius);
      } else {
        return;
      }
      setRadius(adjustEstimate.newRadius);
      setCells(result.cells, result.h3_resolution);
      addToast(`Radio ajustado a ${adjustEstimate.newRadius}m · ${result.h3_cell_count} zonas`, "ok");
    } catch {
      addToast("Error al ajustar radio.", "error");
    } finally {
      setLoading(false);
      setAdjustEstimate(null);
    }
  };

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 min-w-[62px]">Cobertura</span>
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-xs font-bold min-w-[30px] text-right ${textColor}`}>
          {pct}%
        </span>
      </div>

      {isLow && (
        <div className="mt-2 bg-red-50 rounded-lg p-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-[#EA4335] shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 leading-snug">
              Cobertura baja — el radio ({radiusM}m) es demasiado grande para esta zona.
            </p>
          </div>
          {suggestedRadius && (
            <button
              onClick={handleSuggestAdjust}
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center gap-1.5 bg-[#EA4335] text-white
                         border-none rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer
                         hover:bg-[#d33426] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowDownCircle size={14} />
              {loading ? "Calculando..." : `Ajustar radio a ${suggestedRadius}m`}
            </button>
          )}
        </div>
      )}

      {isMedium && (
        <p className="mt-1.5 text-xs text-amber-600 leading-snug">
          Cobertura moderada — considerá reducir el radio para mayor precisión.
        </p>
      )}

      {showConfirm && adjustEstimate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full mx-4">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Ajustar radio de búsqueda</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Radio actual</span>
                  <span className="font-medium text-slate-700">{radiusM}m → {adjustEstimate.newRadius}m</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Zonas</span>
                  <span className="font-medium text-slate-700">{cells.length} → {adjustEstimate.newCells}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Costo por keyword</span>
                  <span className="font-medium text-slate-700">
                    ~${adjustEstimate.costUsd.toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Costo real</span>
                  <span className={`font-bold ${adjustEstimate.realCostUsd > 0 ? "text-[#EA4335]" : "text-[#34A853]"}`}>
                    {adjustEstimate.realCostUsd > 0
                      ? `~$${adjustEstimate.realCostUsd.toFixed(2)} USD`
                      : "$0 (gratis)"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-snug">
                Más zonas = mejor cobertura pero más llamadas a la API.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowConfirm(false); setAdjustEstimate(null); }}
                  className="flex-1 border border-slate-200 bg-white text-slate-600 rounded-lg
                             px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50
                             transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmAdjust}
                  disabled={loading}
                  className="flex-1 bg-[#4285F4] text-white border-none rounded-lg px-3 py-2
                             text-xs font-semibold cursor-pointer hover:bg-[#3367D6]
                             disabled:opacity-50 transition-colors"
                >
                  {loading ? "Ajustando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
