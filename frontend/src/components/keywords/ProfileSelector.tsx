import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, FolderOpen, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { listProfiles, createProfile, updateProfile, deleteProfile } from "../../api/keyword-profiles";
import { useUIStore } from "../../stores/uiStore";
import type { KeywordProfile } from "../../types";

interface Props {
  onSelect: (keywords: string[]) => void;
  currentKeywords: string[];
  disabled?: boolean;
}

export function ProfileSelector({ onSelect, currentKeywords, disabled }: Props) {
  const [profiles, setProfiles] = useState<KeywordProfile[]>([]);
  const [open, setOpen] = useState(true);

  // Create new profile
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Expand to see keywords (without applying)
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Edit mode
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [editInput, setEditInput] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const addToast = useUIStore((s) => s.addToast);

  const loadProfiles = async () => {
    try {
      const data = await listProfiles();
      setProfiles(data);
    } catch {
      addToast("Error al cargar perfiles", "error");
    }
  };

  useEffect(() => { loadProfiles(); }, []);

  const handleSelect = (profile: KeywordProfile) => {
    if (editingId === profile.id) return;
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

  const handleDelete = async (id: number, nombre: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteProfile(id);
      if (expandedId === id) setExpandedId(null);
      if (editingId === id) setEditingId(null);
      await loadProfiles();
      addToast(`Perfil "${nombre}" eliminado`, "info");
    } catch {
      addToast("Error al eliminar perfil", "error");
    }
  };

  const startEdit = (profile: KeywordProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(profile.id);
    setEditName(profile.nombre);
    setEditKeywords([...profile.keywords]);
    setEditInput("");
    setExpandedId(null);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditKeywords([]);
    setEditInput("");
  };

  const addEditKeyword = () => {
    const kw = editInput.trim().toLowerCase();
    if (!kw || editKeywords.includes(kw)) return;
    setEditKeywords((prev) => [...prev, kw]);
    setEditInput("");
  };

  const removeEditKeyword = (kw: string) => {
    setEditKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const handleUpdate = async () => {
    if (!editingId || !editName.trim() || editKeywords.length === 0) return;
    try {
      await updateProfile(editingId, editName.trim(), editKeywords);
      await loadProfiles();
      addToast(`Perfil "${editName.trim()}" actualizado`, "ok");
      cancelEdit();
    } catch {
      addToast("Error al actualizar perfil", "error");
    }
  };

  return (
    <div className="mt-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500
                     hover:text-slate-700 cursor-pointer bg-transparent border-none p-0
                     transition-colors"
        >
          <FolderOpen size={13} />
          Perfiles
          {profiles.length > 0 && (
            <span className="text-slate-400 font-normal">({profiles.length})</span>
          )}
          {open
            ? <ChevronDown size={12} className="text-slate-400" />
            : <ChevronRight size={12} className="text-slate-400" />}
        </button>

        {!saving && currentKeywords.length > 0 && (
          <button
            onClick={() => { setSaving(true); setOpen(true); }}
            disabled={disabled}
            className="flex items-center gap-1 text-xs text-[#4285F4] hover:text-[#3367D6]
                       cursor-pointer disabled:opacity-40 bg-transparent border-none
                       transition-colors"
          >
            <Save size={12} />
            Guardar
          </button>
        )}
      </div>

      {/* Save new profile input */}
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
            className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent
                       border-none p-1 flex items-center transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Profile list */}
      {open && (
        <div className="flex flex-col gap-0.5">
          {profiles.length === 0 && (
            <p className="text-xs text-slate-400 italic">Sin perfiles guardados</p>
          )}

          {profiles.map((p) => {
            const isEditing = editingId === p.id;
            const isExpanded = expandedId === p.id && !isEditing;

            if (isEditing) {
              return (
                <div key={p.id} className="rounded-lg border border-[#4285F4]/30 bg-blue-50/40 px-2.5 py-2">
                  {/* Edit: name input */}
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nombre del perfil..."
                    className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs
                               bg-white outline-none focus:border-[#4285F4] mb-2"
                  />

                  {/* Edit: keyword chips */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {editKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 bg-white border border-slate-200
                                   text-slate-600 rounded-full px-2 py-0.5 text-[11px]"
                      >
                        {kw}
                        <button
                          onClick={() => removeEditKeyword(kw)}
                          className="text-slate-400 hover:text-[#EA4335] cursor-pointer
                                     bg-transparent border-none p-0 flex items-center"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Edit: add keyword input */}
                  <div className="flex gap-1 mb-2">
                    <input
                      type="text"
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEditKeyword(); } }}
                      placeholder="Agregar keyword..."
                      className="flex-1 min-w-0 border border-slate-200 rounded-md px-2 py-1 text-xs
                                 bg-white outline-none focus:border-[#4285F4]"
                    />
                    <button
                      onClick={addEditKeyword}
                      disabled={!editInput.trim()}
                      className="text-slate-400 hover:text-[#4285F4] cursor-pointer
                                 bg-transparent border-none p-1 flex items-center
                                 disabled:opacity-30 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Edit: Save / Cancel */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={!editName.trim() || editKeywords.length === 0}
                      className="text-xs bg-[#4285F4] text-white px-3 py-1 rounded-md cursor-pointer
                                 hover:bg-[#3367D6] disabled:opacity-40 border-none transition-colors"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer
                                 bg-transparent border-none transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={p.id} className="rounded-lg hover:bg-slate-50 group transition-colors">
                {/* Profile row */}
                <div className="flex items-center px-2.5 py-2">
                  {/* Expand chevron */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="text-slate-300 hover:text-slate-500 cursor-pointer bg-transparent
                               border-none p-0 mr-1.5 flex items-center flex-shrink-0 transition-colors"
                  >
                    {isExpanded
                      ? <ChevronDown size={12} />
                      : <ChevronRight size={12} />}
                  </button>

                  {/* Name (clickable to apply) */}
                  <button
                    onClick={() => handleSelect(p)}
                    disabled={disabled}
                    className="text-xs text-slate-700 font-medium cursor-pointer bg-transparent
                               border-none text-left flex-1 min-w-0 disabled:opacity-40
                               hover:text-[#4285F4] transition-colors"
                  >
                    {p.nombre}
                    <span className="text-slate-400 font-normal ml-1">({p.keywords.length})</span>
                  </button>

                  {/* Action icons — visible on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => startEdit(p, e)}
                      className="text-slate-300 hover:text-[#4285F4] cursor-pointer
                                 bg-transparent border-none p-0.5 flex items-center transition-colors"
                      title="Editar"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(p.id, p.nombre, e)}
                      className="text-slate-300 hover:text-[#EA4335] cursor-pointer
                                 bg-transparent border-none p-0.5 flex items-center transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Expanded: keyword chips preview */}
                {isExpanded && (
                  <div className="px-2.5 pb-2.5 flex flex-wrap gap-1">
                    {p.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center bg-slate-100 text-slate-600
                                   rounded-full px-2 py-0.5 text-[11px]"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
