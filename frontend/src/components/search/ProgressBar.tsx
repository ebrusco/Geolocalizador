import { Loader2, CheckCircle2, XCircle, Ban } from "lucide-react";
import { useSearchStore } from "../../stores/searchStore";

export function ProgressBar() {
  const { status, completedCells, totalCells, totalPlaces } = useSearchStore();

  if (status === "idle") return null;

  const pct = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0;

  const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    running: { color: "bg-[#4285F4]", icon: <Loader2 size={14} className="animate-spin text-[#4285F4]" />, label: "Buscando..." },
    completed: { color: "bg-[#34A853]", icon: <CheckCircle2 size={14} className="text-[#34A853]" />, label: "Completada" },
    failed: { color: "bg-[#EA4335]", icon: <XCircle size={14} className="text-[#EA4335]" />, label: "Error" },
    cancelled: { color: "bg-[#FBBC04]", icon: <Ban size={14} className="text-[#FBBC04]" />, label: "Cancelada" },
  };

  const { color, icon, label } = config[status] || config.running;

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
          {icon}
          {label}
        </span>
        <span className="text-xs font-bold text-slate-600">{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-slate-400">
          {completedCells} / {totalCells} zonas
        </span>
        <span className="text-xs text-slate-400">
          {totalPlaces} negocios
        </span>
      </div>
    </div>
  );
}
