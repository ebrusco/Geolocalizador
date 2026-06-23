import { MapPin, Grid3x3 } from "lucide-react";
import { useTerritoryStore } from "../../stores/territoryStore";
import { CoverageInfo } from "./CoverageInfo";

export function TerritoryInfo() {
  const { nombre, areaKm2, cells } = useTerritoryStore();

  if (!nombre) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-start gap-2">
        <MapPin size={14} className="text-[#4285F4] shrink-0 mt-0.5" />
        <div className="text-sm leading-snug">
          <span className="font-semibold text-slate-800">{nombre}</span>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
            <span>{areaKm2} km²</span>
            <span className="flex items-center gap-1">
              <Grid3x3 size={12} />
              {cells.length} zonas
            </span>
          </div>
        </div>
      </div>
      <CoverageInfo />
    </div>
  );
}
