import { Grid3x3, Building2, TrendingUp, Activity } from "lucide-react";
import { useSearchStore } from "../../stores/searchStore";
import { useTerritoryStore } from "../../stores/territoryStore";

export function SearchStats() {
  const { status, totalPlaces, completedCells, totalCells } = useSearchStore();
  const cells = useTerritoryStore((s) => s.cells);

  if (status === "idle" && cells.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      <Stat icon={<Grid3x3 size={14} />} label="Zonas" value={cells.length} />
      <Stat icon={<Building2 size={14} />} label="Negocios" value={totalPlaces} />
      <Stat icon={<TrendingUp size={14} />} label="Progreso" value={totalCells > 0 ? `${completedCells}/${totalCells}` : "--"} />
      <Stat icon={<Activity size={14} />} label="Estado" value={statusLabel(status)} />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-sm font-bold text-slate-700">{value}</div>
    </div>
  );
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    idle: "Esperando",
    running: "Buscando",
    completed: "Listo",
    failed: "Error",
    cancelled: "Cancelado",
  };
  return map[s] || s;
}
