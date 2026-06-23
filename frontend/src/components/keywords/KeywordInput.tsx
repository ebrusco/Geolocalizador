import { useState } from "react";
import { Plus, X, AlertTriangle } from "lucide-react";

interface Props {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  disabled?: boolean;
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function areSimilar(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na + "s" === nb || nb + "s" === na) return true;
  if (na + "es" === nb || nb + "es" === na) return true;
  if (na.endsWith("s") && na.slice(0, -1) === nb) return true;
  if (nb.endsWith("s") && nb.slice(0, -1) === na) return true;
  return false;
}

function findSimilar(kw: string, existing: string[]): string | null {
  for (const e of existing) {
    if (areSimilar(kw, e)) return e;
  }
  return null;
}

export function KeywordInput({ keywords, onChange, disabled }: Props) {
  const [input, setInput] = useState("");
  const [warning, setWarning] = useState<string | null>(null);

  const addKeyword = () => {
    const kw = input.trim().toLowerCase();
    if (!kw || keywords.includes(kw)) return;

    const similar = findSimilar(kw, keywords);
    if (similar) {
      setWarning(`"${kw}" es muy similar a "${similar}" (Google devuelve los mismos resultados)`);
      return;
    }

    setWarning(null);
    onChange([...keywords, kw]);
    setInput("");
  };

  const forceAdd = () => {
    const kw = input.trim().toLowerCase();
    if (!kw || keywords.includes(kw)) return;
    setWarning(null);
    onChange([...keywords, kw]);
    setInput("");
  };

  const removeKeyword = (kw: string) => {
    onChange(keywords.filter((k) => k !== kw));
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setWarning(null); }}
          onKeyDown={(e) => e.key === "Enter" && addKeyword()}
          placeholder="ej: restaurante, farmacia..."
          disabled={disabled}
          className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-sm
                     bg-white outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/10
                     placeholder:text-slate-400 disabled:opacity-50"
        />
        <button
          onClick={addKeyword}
          disabled={disabled || !input.trim()}
          className="w-8 h-8 rounded-full bg-[#4285F4] text-white border-none flex items-center justify-center
                     cursor-pointer hover:bg-[#3367D6] disabled:opacity-40 disabled:cursor-not-allowed
                     shrink-0 self-center transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {warning && (
        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-snug">{warning}</p>
          </div>
          <div className="flex gap-3 mt-2 ml-5">
            <button
              onClick={forceAdd}
              className="text-xs text-amber-600 font-medium cursor-pointer bg-transparent border-none
                         hover:text-amber-800 transition-colors"
            >
              Agregar igual
            </button>
            <button
              onClick={() => { setWarning(null); setInput(""); }}
              className="text-xs text-slate-500 cursor-pointer bg-transparent border-none
                         hover:text-slate-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 bg-[#E8F0FE] text-[#4285F4] px-2.5 py-1
                         rounded-full text-xs font-medium"
            >
              {kw}
              {!disabled && (
                <button
                  onClick={() => removeKeyword(kw)}
                  className="text-[#4285F4]/60 hover:text-[#EA4335] cursor-pointer bg-transparent
                             border-none p-0 flex items-center transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
