import { Pentagon, Square, Circle } from "lucide-react";
import { useTerritoryStore } from "../../stores/territoryStore";
import { useDrawingStore } from "../../stores/drawingStore";

const tools = [
  { mode: "polygon" as const, icon: Pentagon, label: "Polígono", hint: "Doble clic para cerrar" },
  { mode: "rectangle" as const, icon: Square, label: "Rectángulo", hint: "Clic en 2 esquinas" },
  { mode: "circle" as const, icon: Circle, label: "Círculo", hint: "Clic centro, luego borde" },
];

export function DrawingToolbar() {
  const mode = useTerritoryStore((s) => s.mode);
  const isRefining = useTerritoryStore((s) => s.isRefining);
  const drawMode = useDrawingStore((s) => s.drawMode);
  const setDrawMode = useDrawingStore((s) => s.setDrawMode);

  const active = mode === "draw" || isRefining;
  if (!active) return null;

  const current = tools.find((t) => t.mode === drawMode);

  return (
    <div className="flex items-center gap-2">
      <div
        className="bg-white rounded-full px-1.5 py-1.5 flex gap-1"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
      >
        {tools.map(({ mode: m, icon: Icon, label }) => (
          <button
            key={m}
            onClick={() => setDrawMode(m)}
            title={label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-none text-xs
                        font-medium cursor-pointer transition-all ${
                          drawMode === m
                            ? "bg-[#4285F4] text-white"
                            : "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      {current && (
        <span className="text-xs text-slate-500 bg-white/90 rounded-full px-3 py-1"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          {current.hint}
        </span>
      )}
    </div>
  );
}
