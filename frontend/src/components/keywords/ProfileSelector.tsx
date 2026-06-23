import { useEffect, useState } from "react";
import { FolderOpen, Save, Trash2, X } from "lucide-react";
import { listProfiles, createProfile, deleteProfile } from "../../api/keyword-profiles";
import { useUIStore } from "../../stores/uiStore";
import type { KeywordProfile } from "../../types";

interface Props {
  onSelect: (keywords: string[]) => void;
  currentKeywords: string[];
  disabled?: boolean;
}

export function ProfileSelector({ onSelect, currentKeywords, disabled }: Props) {
  const [profiles, setProfiles] = useState<KeywordProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const addToast = useUIStore((s) => s.addToast);

  const loadProfiles = async () => {
    try {
      const data = await listProfiles();
      setProfiles(data);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleSelect = (profile: KeywordProfile) => {
    onSelect(profile.keywords);
    addToast(`Perfil "${profile.nombre}" cargado`, "ok");
  };

  const handleSave = async () => {
    const name = saveName.trim();
    if (!name || currentKeywords.length === 0) return;
    try {
      await createProfile(name, currentKeywords);
      setSaveName("");
      setSaving(false);
      await loadProfiles();
      addToast(`Perfil "${name}" guardado`, "ok");
    } catch {
      addToast("Error al guardar perfil", "error");
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    try {
      await deleteProfile(id);
      await loadProfiles();
      addToast(`Perfil "${nombre}" eliminado`, "info");
    } catch {
      addToast("Error al eliminar perfil", "error");
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <FolderOpen size={13} />
          Perfiles guardados
        </span>
        {!saving && currentKeywords.length > 0 && (
          <button
            onClick={() => setSaving(true)}
            disabled={disabled}
            className="flex items-center gap-1 text-xs text-[#4285F4] hover:text-[#3367D6] cursor-pointer
                       disabled:opacity-40 bg-transparent border-none transition-colors"
          >
            <Save size={12} />
            Guardar
          </button>
        )}
      </div>

      {saving && (
        <div className="flex gap-1.5 mb-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Nombre del perfil..."
            className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs
                       bg-white outline-none focus:border-[#4285F4]"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim()}
            className="text-xs bg-[#4285F4] text-white px-3 py-1.5 rounded-lg cursor-pointer
                       hover:bg-[#3367D6] disabled:opacity-40 border-none transition-colors"
          >
            OK
          </button>
          <button
            onClick={() => setSaving(false)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none
                       p-1 flex items-center transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {profiles.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Cargando perfiles...</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg px-2.5 py-2
                         hover:bg-slate-50 group transition-colors"
            >
              <button
                onClick={() => handleSelect(p)}
                disabled={disabled}
                className="text-xs text-slate-700 font-medium cursor-pointer bg-transparent
                           border-none text-left flex-1 min-w-0 disabled:opacity-40
                           hover:text-[#4285F4] transition-colors"
              >
                {p.nombre}
                <span className="text-slate-400 font-normal ml-1">
                  ({p.keywords.length})
                </span>
              </button>
              <button
                onClick={() => handleDelete(p.id, p.nombre)}
                className="text-slate-300 hover:text-[#EA4335] cursor-pointer
                           opacity-0 group-hover:opacity-100 bg-transparent border-none
                           p-0.5 flex items-center transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
