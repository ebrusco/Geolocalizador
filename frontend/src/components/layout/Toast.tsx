import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";

const config = {
  ok: { icon: CheckCircle2, bar: "bg-[#34A853]", iconColor: "text-[#34A853]" },
  error: { icon: AlertCircle, bar: "bg-[#EA4335]", iconColor: "text-[#EA4335]" },
  info: { icon: Info, bar: "bg-[#4285F4]", iconColor: "text-[#4285F4]" },
};

export function Toast() {
  const toasts = useUIStore((s) => s.toasts);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => {
        const { icon: Icon, bar, iconColor } = config[t.type];
        return (
          <div
            key={t.id}
            className="flex items-center gap-2.5 bg-white rounded-lg px-4 py-3 text-sm
                       font-medium text-slate-700 max-w-[90vw] animate-[slide-up_0.2s_ease-out]
                       overflow-hidden relative"
            style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${bar}`} />
            <Icon size={16} className={iconColor} />
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
