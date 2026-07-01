import { useEffect, useRef, useState } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import {
  autocompleteTerritory,
  geocodeTerritoryByPlaceId,
  type TerritorySuggestion,
} from "../../api/territories";
import { useTerritoryStore } from "../../stores/territoryStore";
import { useUIStore } from "../../stores/uiStore";

export function TerritoryInput() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TerritorySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
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
    </div>
  );
}
