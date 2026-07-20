import { useState, useRef } from "react";
import { Download, Mail, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useSearchStore } from "../../stores/searchStore";
import { useUIStore } from "../../stores/uiStore";
import {
  downloadExport,
  scrapeEmails,
  type EmailScrapeProgress,
  type EmailScrapeResult,
} from "../../api/exports";

type ExportFormat = "xlsx" | "csv";
type ScrapeStatus = "idle" | "scraping" | "done" | "error";
type Decision = "pending" | "with_emails" | "without_emails";

export function ExportButton() {
  const { searchId, status, totalPlaces } = useSearchStore();
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [downloading, setDownloading] = useState(false);
  const [decision, setDecision] = useState<Decision>("pending");
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus>("idle");
  const [progress, setProgress] = useState<EmailScrapeProgress | null>(null);
  const [result, setResult] = useState<EmailScrapeResult | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  if (status !== "completed" || !searchId || totalPlaces === 0) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadExport(searchId, format);
    } catch {
      addToast("Error al descargar archivo", "error");
    } finally {
      setDownloading(false);
    }
  };

  const startScraping = () => {
    setScrapeStatus("scraping");
    setProgress(null);
    setResult(null);

    const cancel = scrapeEmails(
      searchId,
      (p) => setProgress(p),
      (r) => {
        setResult(r);
        setScrapeStatus("done");
        localStorage.setItem(`emails_${searchId}`, String(r.found));
      },
      () => {
        setScrapeStatus("error");
      },
    );
    cancelRef.current = cancel;
  };

  const chooseWithEmails = () => {
    setDecision("with_emails");
    startScraping();
  };

  const chooseWithoutEmails = () => {
    setDecision("without_emails");
    handleDownload();
  };

  return (
    <div className="space-y-2.5">
      <div className="flex rounded-full bg-slate-100 p-0.5">
        <button
          onClick={() => setFormat("xlsx")}
          className={`flex-1 px-3 py-1 text-xs font-medium rounded-full cursor-pointer border-none transition-all ${
            format === "xlsx"
              ? "bg-white text-slate-700 shadow-sm"
              : "bg-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Excel
        </button>
        <button
          onClick={() => setFormat("csv")}
          className={`flex-1 px-3 py-1 text-xs font-medium rounded-full cursor-pointer border-none transition-all ${
            format === "csv"
              ? "bg-white text-slate-700 shadow-sm"
              : "bg-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          CSV
        </button>
      </div>

      {decision === "pending" && (
        <>
          <button
            onClick={chooseWithEmails}
            className="flex items-center justify-center gap-2 w-full bg-[#4285F4] text-white rounded-lg
                       px-4 py-2.5 text-sm font-semibold hover:bg-[#3367D6] transition-colors
                       cursor-pointer border-none"
          >
            <Mail size={16} />
            Buscar emails y descargar
          </button>
          <button
            onClick={chooseWithoutEmails}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400
                       hover:text-slate-600 cursor-pointer bg-transparent border-none
                       transition-colors"
          >
            <Download size={12} />
            Descargar solo negocios (sin emails)
          </button>
        </>
      )}

      {decision === "with_emails" && (
        <>
          {scrapeStatus === "scraping" && progress && (
            <div className="bg-[#E8F0FE] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-[#4285F4]">
                  <Loader2 size={14} className="animate-spin" />
                  Buscando emails...
                </span>
                <span className="text-xs font-bold text-[#4285F4]">
                  {progress.found} encontrados
                </span>
              </div>
              <div className="w-full bg-[#4285F4]/20 rounded-full h-1.5">
                <div
                  className="bg-[#4285F4] h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.round((progress.completed / progress.total) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-[#4285F4]/70">
                {progress.completed}/{progress.total} sitios web visitados
              </p>
            </div>
          )}

          {scrapeStatus === "scraping" && !progress && (
            <div className="bg-[#E8F0FE] rounded-lg p-3">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#4285F4]">
                <Loader2 size={14} className="animate-spin" />
                Iniciando búsqueda de emails...
              </span>
            </div>
          )}

          {scrapeStatus === "done" && result && (
            <>
              <div className="bg-[#E6F4EA] rounded-lg p-3">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-[#34A853]" />
                  <span className="text-xs font-semibold text-[#34A853]">
                    {result.found} emails encontrados
                  </span>
                  <span className="text-xs text-[#34A853]/70">
                    de {result.total_with_web} sitios
                  </span>
                </div>
              </div>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center justify-center gap-2 w-full bg-[#4285F4] text-white rounded-lg
                           px-4 py-2.5 text-sm font-semibold hover:bg-[#3367D6] transition-colors
                           cursor-pointer border-none disabled:opacity-60"
              >
                {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Descargar {totalPlaces} negocios · {result.found} emails
              </button>
            </>
          )}

          {scrapeStatus === "error" && (
            <div className="bg-[#FCE8E6] rounded-lg p-3 space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#EA4335]">
                <AlertCircle size={14} />
                Error buscando emails
              </span>
              <div className="flex gap-3">
                <button
                  onClick={startScraping}
                  className="flex items-center gap-1 text-xs text-[#EA4335] cursor-pointer bg-transparent
                             border-none hover:text-[#d33426] transition-colors"
                >
                  <RefreshCw size={12} />
                  Reintentar
                </button>
                <button
                  onClick={chooseWithoutEmails}
                  className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer bg-transparent
                             border-none hover:text-slate-700 transition-colors"
                >
                  <Download size={12} />
                  Descargar sin emails
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {decision === "without_emails" && (
        <>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center justify-center gap-2 w-full bg-[#4285F4] text-white rounded-lg
                       px-4 py-2.5 text-sm font-semibold hover:bg-[#3367D6] transition-colors
                       cursor-pointer border-none disabled:opacity-60"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Descargar {totalPlaces} negocios
          </button>
          <button
            onClick={chooseWithEmails}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400
                       hover:text-slate-600 cursor-pointer bg-transparent border-none
                       transition-colors"
          >
            <Mail size={12} />
            Buscar emails también
          </button>
        </>
      )}
    </div>
  );
}
