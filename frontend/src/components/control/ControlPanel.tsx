import { useCallback, useEffect, useState } from "react";
import { X, Gauge, CalendarDays, CreditCard, DollarSign, Users, Plus, Trash2, Shield, Loader2 } from "lucide-react";
import { getUsage } from "../../api/usage";
import { listAllowedEmails, addAllowedEmail, removeAllowedEmail, type AllowedEmail } from "../../api/allowed-emails";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import type { UsageSummary } from "../../types";

type Tab = "usage" | "access";

interface Props {
  onClose: () => void;
}

export function ControlPanel({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("usage");
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const currentUser = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const loadUsage = async () => {
    try {
      const data = await getUsage();
      setUsage(data);
    } catch {
      addToast("Error al cargar datos de uso", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadAccess = async () => {
    setAccessLoading(true);
    setAccessError("");
    try {
      const data = await listAllowedEmails();
      setEmails(data.emails);
      setAdminEmails(data.admin_emails);
      setIsAdmin(true);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setIsAdmin(false);
      } else {
        setAccessError("Error al cargar accesos");
      }
    } finally {
      setAccessLoading(false);
    }
  };

  useEffect(() => {
    loadUsage();
    const interval = setInterval(loadUsage, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tab === "access") loadAccess();
  }, [tab]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    setAccessError("");
    try {
      await addAllowedEmail(newEmail.trim());
      setNewEmail("");
      await loadAccess();
    } catch (err: any) {
      setAccessError(err.response?.data?.detail || "Error al agregar email");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: number, email: string) => {
    if (adminEmails.includes(email.toLowerCase())) return;
    try {
      await removeAllowedEmail(id);
      await loadAccess();
    } catch {
      setAccessError("Error al eliminar email");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex gap-1 bg-slate-100 rounded-full p-0.5">
            <button
              onClick={() => setTab("usage")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer transition-colors ${
                tab === "usage"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "bg-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="flex items-center gap-1.5"><Gauge size={13} />Uso de API</span>
            </button>
            <button
              onClick={() => setTab("access")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer transition-colors ${
                tab === "access"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "bg-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="flex items-center gap-1.5"><Users size={13} />Accesos</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400
                       hover:bg-slate-100 cursor-pointer bg-transparent border-none transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {tab === "usage" && (
          <div className="p-5">
            {loading && <p className="text-sm text-slate-400">Cargando...</p>}
            {!loading && !usage && <p className="text-sm text-[#EA4335]">Error al cargar datos de uso.</p>}

            {usage && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                    <span>Crédito gratis mensual</span>
                    <span className="font-semibold">
                      ${usage.free_credit_remaining_usd.toFixed(2)} / ${usage.free_credit_total_usd.toFixed(2)} USD
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        usage.free_credit_pct > 50
                          ? "bg-[#34A853]"
                          : usage.free_credit_pct > 20
                            ? "bg-[#FBBC04]"
                            : "bg-[#EA4335]"
                      }`}
                      style={{ width: `${Math.max(usage.free_credit_pct, 1)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{usage.free_calls_remaining.toLocaleString()} llamadas gratis</span>
                    <span>{usage.free_credit_pct.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <StatCard icon={<Gauge size={16} />} label="Hoy" calls={usage.calls_today} cost={usage.cost_today_usd} />
                  <StatCard icon={<CalendarDays size={16} />} label="Este mes" calls={usage.calls_month} cost={usage.cost_month_usd} />
                  <StatCard icon={<CreditCard size={16} />} label="Costo real" calls={null} cost={usage.real_cost_usd} highlight={usage.is_free_exhausted} />
                  <StatCard icon={<DollarSign size={16} />} label="Por llamada" calls={null} cost={usage.cost_per_call_usd} costPrefix="" />
                </div>

                {usage.is_free_exhausted ? (
                  <div className="bg-red-50 rounded-lg p-3 text-xs text-red-700">
                    <span className="font-bold">Crédito gratis agotado.</span> Cada llamada adicional
                    cuesta ${usage.cost_per_call_usd} USD. Acumulado:
                    <span className="font-bold"> ${usage.real_cost_usd.toFixed(2)} USD</span>
                  </div>
                ) : (
                  <div className="bg-green-50 rounded-lg p-3 text-xs text-green-700">
                    Dentro del crédito gratis.
                    Quedan <span className="font-bold">{usage.free_calls_remaining.toLocaleString()}</span> llamadas sin costo.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "access" && (
          <div className="p-5">
            {accessLoading && <p className="text-sm text-slate-400">Cargando...</p>}

            {!accessLoading && !isAdmin && (
              <div className="text-center py-6">
                <Shield size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Solo el administrador puede gestionar accesos.</p>
              </div>
            )}

            {!accessLoading && isAdmin && (
              <div className="space-y-4">
                <form onSubmit={handleAdd} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700
                               placeholder:text-slate-400 focus:outline-none focus:border-[#4285F4]
                               focus:ring-1 focus:ring-[#4285F4] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={adding}
                    className="px-3 py-2 rounded-lg bg-[#4285F4] text-white text-sm font-medium
                               hover:bg-[#3367D6] disabled:opacity-50 cursor-pointer border-none
                               transition-colors flex items-center gap-1"
                  >
                    {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Agregar
                  </button>
                </form>

                {accessError && (
                  <p className="text-xs text-[#EA4335] bg-red-50 rounded-lg px-3 py-2">{accessError}</p>
                )}

                <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                  {emails.map((entry) => {
                    const isEnvAdmin = adminEmails.includes(entry.email.toLowerCase());
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isEnvAdmin && <Shield size={13} className="text-[#4285F4] flex-shrink-0" />}
                          <span className="text-sm text-slate-700 truncate">{entry.email}</span>
                          {isEnvAdmin && (
                            <span className="text-[10px] bg-blue-100 text-[#4285F4] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                              Admin
                            </span>
                          )}
                        </div>
                        {!isEnvAdmin && (
                          <button
                            onClick={() => handleRemove(entry.id, entry.email)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400
                                       hover:bg-red-50 hover:text-[#EA4335] cursor-pointer bg-transparent
                                       border-none transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {emails.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No hay emails en la lista. Agregá uno para restringir el acceso.
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                  Los emails marcados como <span className="font-bold">Admin</span> se configuran
                  en las variables de entorno y no pueden eliminarse desde acá.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  calls,
  cost,
  highlight = false,
  costPrefix = "$",
}: {
  icon: React.ReactNode;
  label: string;
  calls: number | null;
  cost: number;
  highlight?: boolean;
  costPrefix?: string;
}) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-red-50" : "bg-slate-50"}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${highlight ? "text-[#EA4335]" : "text-slate-400"}`}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      {calls !== null && (
        <p className="text-lg font-bold text-slate-800">{calls.toLocaleString()}</p>
      )}
      <p className={`text-sm font-semibold ${highlight ? "text-[#EA4335]" : "text-slate-600"}`}>
        {costPrefix}${cost.toFixed(2)} USD
      </p>
    </div>
  );
}
