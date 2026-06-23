import { useState } from "react";
import { AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import type { SearchEstimate } from "../../types";

interface Props {
  estimate: SearchEstimate;
  territorio: string;
  keywords: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CostConfirmModal({ estimate, territorio, keywords, onConfirm, onCancel }: Props) {
  const [firstConfirmed, setFirstConfirmed] = useState(false);
  const isRed = estimate.level === "red";
  const isGreen = estimate.level === "green";
  const hasFreeCredit = estimate.covered_by_free > 0;

  const levelIcon = isRed
    ? <AlertTriangle size={18} className="text-[#EA4335]" />
    : isGreen
      ? <CheckCircle2 size={18} className="text-[#34A853]" />
      : <Zap size={18} className="text-[#FBBC04]" />;

  const levelBg = isRed ? "bg-red-50" : isGreen ? "bg-green-50" : "bg-amber-50";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4">
        <div className={`flex items-center gap-3 p-4 rounded-t-2xl ${levelBg}`}>
          {levelIcon}
          <h3 className="font-bold text-slate-800 text-sm">
            {isRed
              ? "Búsqueda con costo elevado"
              : isGreen
                ? "Confirmar búsqueda"
                : "Búsqueda con costo parcial"}
          </h3>
        </div>

        <div className="p-4 space-y-3">
          {isRed && (
            <p className="text-xs text-slate-600 leading-relaxed">
              Esta búsqueda supera tu crédito gratis. Google devuelve máximo 20 resultados por zona — en áreas densas podrías perder negocios.
            </p>
          )}
          {!isRed && !isGreen && (
            <p className="text-xs text-slate-600 leading-relaxed">
              Una parte de las llamadas se cubrirán con el crédito gratis, pero el resto tendrá costo.
            </p>
          )}

          <div className="bg-slate-50 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Territorio</span>
              <span className="font-medium text-slate-700 truncate ml-2 text-right">{territorio}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Zonas × Keywords</span>
              <span className="font-medium text-slate-700">{estimate.total_cells} × {keywords}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Total llamadas API</span>
              <span className="font-bold text-slate-800">{estimate.total_api_calls.toLocaleString()}</span>
            </div>

            {hasFreeCredit && (
              <div className="flex justify-between text-xs">
                <span className="text-[#34A853]">Cubiertas por crédito gratis</span>
                <span className="font-medium text-[#34A853]">
                  {estimate.covered_by_free.toLocaleString()}
                </span>
              </div>
            )}

            {estimate.paid_calls > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-[#EA4335]">Llamadas con costo</span>
                <span className="font-bold text-[#EA4335]">{estimate.paid_calls.toLocaleString()}</span>
              </div>
            )}

            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
              <span className="font-medium text-slate-600">Costo real</span>
              <span className={`font-bold ${
                estimate.real_cost_usd > 0 ? "text-[#EA4335]" : "text-[#34A853]"
              }`}>
                {estimate.real_cost_usd > 0
                  ? `~$${estimate.real_cost_usd.toFixed(2)} USD`
                  : "$0 (gratis)"}
              </span>
            </div>
          </div>

          {isRed && !firstConfirmed && (
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-xs
                           font-semibold cursor-pointer hover:bg-slate-50 bg-white text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setFirstConfirmed(true)}
                className="flex-1 bg-[#FBBC04] text-white border-none rounded-lg px-3 py-2.5 text-xs
                           font-semibold cursor-pointer hover:bg-amber-500 transition-colors"
              >
                Entiendo los riesgos
              </button>
            </div>
          )}

          {isRed && firstConfirmed && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#EA4335] text-center">
                Confirmar: ~${estimate.real_cost_usd.toFixed(2)} USD fuera del crédito gratis
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-xs
                             font-semibold cursor-pointer hover:bg-slate-50 bg-white text-slate-700 transition-colors"
                >
                  No, cancelar
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 bg-[#EA4335] text-white border-none rounded-lg px-3 py-2.5 text-xs
                             font-semibold cursor-pointer hover:bg-[#d33426] transition-colors"
                >
                  Sí, iniciar
                </button>
              </div>
            </div>
          )}

          {!isRed && (
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-xs
                           font-semibold cursor-pointer hover:bg-slate-50 bg-white text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 text-white border-none rounded-lg px-3 py-2.5 text-xs
                           font-semibold cursor-pointer transition-colors ${
                  isGreen
                    ? "bg-[#34A853] hover:bg-green-700"
                    : "bg-[#FBBC04] hover:bg-amber-500"
                }`}
              >
                Confirmar búsqueda
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
