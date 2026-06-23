import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle, Ban, Clock, Download } from "lucide-react";
import { listSearches } from "../../api/searches";
import { exportSearchUrl } from "../../api/exports";
import type { Search } from "../../types";

export function SearchHistory() {
  const [searches, setSearches] = useState<Search[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await listSearches();
      setSearches(data.searches);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p className="text-xs text-slate-400">Cargando...</p>;
  if (searches.length === 0) return <p className="text-xs text-slate-400 italic">Sin búsquedas previas</p>;

  const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    completed: { icon: <CheckCircle2 size={14} />, color: "text-[#34A853]" },
    running: { icon: <Loader2 size={14} className="animate-spin" />, color: "text-[#4285F4]" },
    failed: { icon: <XCircle size={14} />, color: "text-[#EA4335]" },
    cancelled: { icon: <Ban size={14} />, color: "text-[#FBBC04]" },
    pending: { icon: <Clock size={14} />, color: "text-slate-400" },
  };

  return (
    <div className="flex flex-col gap-1">
      {searches.map((s) => {
        const cfg = statusConfig[s.status] || statusConfig.pending;
        return (
          <div key={s.id} className="rounded-lg px-2.5 py-2 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 truncate">
                {s.territorio_nombre || `Búsqueda #${s.id}`}
              </span>
              <span className={cfg.color}>{cfg.icon}</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 truncate">
              {s.keywords.join(", ")} · {s.total_places} resultados
            </div>
            {s.status === "completed" && s.total_places > 0 && (
              <a
                href={exportSearchUrl(s.id)}
                download
                className="inline-flex items-center gap-1 mt-1 text-xs text-[#4285F4]
                           hover:text-[#3367D6] no-underline transition-colors"
              >
                <Download size={12} />
                Descargar
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
