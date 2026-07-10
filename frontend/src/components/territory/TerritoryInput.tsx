import { useEffect, useRef, useState } from "react";
import { Search, Loader2, MapPin, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import {
  autocompleteTerritory,
  geocodeTerritoryByPlaceId,
  type TerritorySuggestion,
} from "../../api/territories";
import { useTerritoryStore } from "../../stores/territoryStore";
import { useUIStore } from "../../stores/uiStore";

const CPA_PREFIXES: [string, string][] = [
  ["A", "Salta"], ["B", "Buenos Aires"], ["C", "CABA"], ["D", "San Luis"],
  ["E", "Entre Ríos"], ["F", "La Rioja"], ["G", "Santiago del Estero"], ["H", "Chaco"],
  ["J", "San Juan"], ["K", "Catamarca"], ["L", "La Pampa"], ["M", "Mendoza"],
  ["N", "Misiones"], ["P", "Formosa"], ["Q", "Neuquén"], ["R", "Río Negro"],
  ["S", "Santa Fe"], ["T", "Tucumán"], ["U", "Chubut"], ["V", "Tierra del Fuego"],
  ["W", "Corrientes"], ["X", "Córdoba"], ["Y", "Jujuy"], ["Z", "Santa Cruz"],
];

export function TerritoryInput() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TerritorySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { setTerritory, radiusM } = useTerritoryStore();
  const addToast = useUIStore((s) => s.addToast);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await autocompleteTerritory(q);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 300);
  };

  const selectSuggestion = async (suggestion: TerritorySuggestion) => {
    setQuery(suggestion.main_text);
    setOpen(false);
    setSuggestions([]);
    setLoading(true);
    try {
      const result = await geocodeTerritoryByPlaceId(suggestion.place_id, radiusM);
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
      addToast("No se pudo cargar el territorio seleccionado.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = suggestions[activeIndex] ?? suggestions[0];
      if (pick) selectSuggestion(pick);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="Buscar localidad, ciudad o código postal..."
        className="w-full rounded-full pl-9 pr-4 py-2.5 text-sm border border-slate-200
                   bg-white outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/10
                   placeholder:text-slate-400"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
      />

      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-20 mt-1.5 w-full rounded-2xl border border-slate-200 bg-white
                     overflow-hidden py-1.5"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
        >
          {suggestions.map((s, i) => (
            <li key={s.place_id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(s)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full flex items-start gap-2.5 px-4 py-2 text-left text-sm
                            ${i === activeIndex ? "bg-slate-100" : "bg-white"}`}
              >
                <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
                <span>
                  <span className="font-medium text-slate-800">{s.main_text}</span>
                  {s.secondary_text && (
                    <span className="text-slate-400"> · {s.secondary_text}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => { setShowHelp((v) => !v); setOpen(false); }}
        className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600
                   cursor-pointer bg-transparent border-none transition-colors"
      >
        <HelpCircle size={12} />
        ¿Cómo busco por código postal?
        {showHelp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {showHelp && (
        <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p>
            Usá el formato completo (CPA): una letra de provincia seguida del código de
            4 dígitos, ej. <span className="font-mono font-semibold text-slate-800">B1876</span> para
            Bernal. Los códigos de solo 4 números (formato viejo) no funcionan.
          </p>
          <p className="mt-2 font-medium text-slate-500">Prefijos por provincia:</p>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
            {CPA_PREFIXES.map(([letter, name]) => (
              <span key={letter}>
                <span className="font-mono font-semibold text-slate-800">{letter}</span> {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
