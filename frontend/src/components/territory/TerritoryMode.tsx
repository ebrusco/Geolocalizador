import { MapPin, PenTool } from "lucide-react";
import { useTerritoryStore } from "../../stores/territoryStore";

export function TerritoryMode() {
  const mode = useTerritoryStore((s) => s.mode);
  const setMode = useTerritoryStore((s) => s.setMode);
  const clear = useTerritoryStore((s) => s.clear);

  const handleSwitch = (m: "locality" | "draw") => {
    if (m === mode) return;
    clear();
    setMode(m);
  };

  return (
    <div className="flex rounded-full bg-slate-100 p-1 gap-1">
      <button
        onClick={() => handleSwitch("locality")}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full
                    border-none text-xs font-medium cursor-pointer transition-all ${
                      mode === "locality"
                        ? "bg-white text-[#4285F4] shadow-sm"
                        : "bg-transparent text-slate-500 hover:text-slate-700"
                    }`}
      >
        <MapPin size={14} />
        Localidad
      </button>
      <button
        onClick={() => handleSwitch("draw")}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full
                    border-none text-xs font-medium cursor-pointer transition-all ${
                      mode === "draw"
                        ? "bg-white text-[#4285F4] shadow-sm"
                        : "bg-transparent text-slate-500 hover:text-slate-700"
                    }`}
      >
        <PenTool size={14} />
        Dibujar área
      </button>
    </div>
  );
}
