import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { APIProvider } from "@vis.gl/react-google-maps";
import { Settings, ChevronLeft, ChevronRight, PanelLeftClose, PanelRightClose, Crop, RotateCcw, LogOut } from "lucide-react";
import { LoginPage } from "./components/auth/LoginPage";
import { useAuthStore } from "./stores/authStore";
import { getSession } from "./lib/auth";
import { MapContainer } from "./components/map/MapContainer";
import { TerritoryMode } from "./components/territory/TerritoryMode";
import { TerritoryInput } from "./components/territory/TerritoryInput";
import { TerritoryInfo } from "./components/territory/TerritoryInfo";
import { RadiusSlider } from "./components/territory/RadiusSlider";
import { KeywordInput } from "./components/keywords/KeywordInput";
import { ProfileSelector } from "./components/keywords/ProfileSelector";
import { SearchActions } from "./components/search/SearchActions";
import { ProgressBar } from "./components/search/ProgressBar";
import { SearchStats } from "./components/search/SearchStats";
import { ExportButton } from "./components/search/ExportButton";
import { SearchHistory } from "./components/search/SearchHistory";
import { ControlPanel } from "./components/control/ControlPanel";
import { DrawingToolbar } from "./components/map/DrawingToolbar";
import { Toast } from "./components/layout/Toast";
import { useSearchSSE } from "./hooks/useSearchSSE";
import { useSearchStore } from "./stores/searchStore";
import { useTerritoryStore } from "./stores/territoryStore";
import { useUIStore } from "./stores/uiStore";
import { getGridPolygon } from "./api/territories";

const queryClient = new QueryClient();

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

function AppContent() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [showControl, setShowControl] = useState(false);
  const searchId = useSearchStore((s) => s.searchId);
  const status = useSearchStore((s) => s.status);
  const territoryMode = useTerritoryStore((s) => s.mode);
  const hasTerritory = useTerritoryStore((s) => !!s.bounds);
  const isRefining = useTerritoryStore((s) => s.isRefining);
  const hasRefinement = useTerritoryStore((s) => !!s.refinedPolygon);
  const setRefining = useTerritoryStore((s) => s.setRefining);
  const storeClearRefinement = useTerritoryStore((s) => s.clearRefinement);
  const geojson = useTerritoryStore((s) => s.geojson);
  const radiusM = useTerritoryStore((s) => s.radiusM);
  const setCells = useTerritoryStore((s) => s.setCells);
  const leftOpen = useUIStore((s) => s.leftPanelOpen);
  const rightOpen = useUIStore((s) => s.rightPanelOpen);
  const toggleLeft = useUIStore((s) => s.toggleLeftPanel);
  const toggleRight = useUIStore((s) => s.toggleRightPanel);

  const addToast = useUIStore((s) => s.addToast);

  const clearRefinement = async () => {
    storeClearRefinement();
    if (geojson) {
      try {
        const result = await getGridPolygon(geojson, radiusM);
        setCells(result.cells, result.h3_resolution);
      } catch {
        addToast("Error al recalcular grilla", "error");
      }
    }
  };

  useSearchSSE(searchId);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Map — fills entire viewport */}
      <div className="absolute inset-0 z-0">
        <MapContainer />
      </div>

      {/* Drawing toolbar — floats above map */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <DrawingToolbar />
      </div>

      {/* Left panel — floating card */}
      {leftOpen ? (
        <aside className="absolute top-4 left-4 z-10 w-[320px] bg-white rounded-xl overflow-hidden"
               style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)", maxHeight: "calc(100vh - 2rem)" }}>
          {/* Panel header with branding + collapse */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-bold text-[#4285F4] tracking-tight">ProspectoAI</span>
            <button onClick={toggleLeft}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 cursor-pointer transition-colors border-none bg-transparent">
              <PanelLeftClose size={16} />
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 5.5rem)" }}>
            {/* Territory section */}
            <div className="p-4 border-b border-slate-100/60">
              <p className="text-xs font-medium text-slate-500 mb-3">Territorio</p>
              <TerritoryMode />
              <div className="mt-3">
                {territoryMode === "locality" ? (
                  <TerritoryInput />
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Dibujá un polígono o rectángulo en el mapa para definir la zona.
                  </p>
                )}
              </div>
              <TerritoryInfo />

              {territoryMode === "locality" && hasTerritory && status !== "running" && (
                <div className="mt-3 space-y-2">
                  {!isRefining && !hasRefinement && (
                    <button
                      onClick={() => setRefining(true)}
                      className="w-full flex items-center justify-center gap-1.5 border border-[#4285F4]
                                 text-[#4285F4] bg-transparent rounded-lg px-3 py-2 text-xs font-medium
                                 cursor-pointer hover:bg-[#E8F0FE] transition-colors"
                    >
                      <Crop size={14} />
                      Refinar zona
                    </button>
                  )}
                  {isRefining && (
                    <p className="text-xs text-slate-500 italic">
                      Dibujá un polígono, rectángulo o círculo dentro de la localidad para acotar la búsqueda.
                    </p>
                  )}
                  {isRefining && (
                    <button
                      onClick={() => setRefining(false)}
                      className="w-full border border-slate-200 bg-white text-slate-500 rounded-lg
                                 px-3 py-2 text-xs font-medium cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      Cancelar refinamiento
                    </button>
                  )}
                  {hasRefinement && !isRefining && (
                    <div className="flex gap-2">
                      <button
                        onClick={clearRefinement}
                        className="flex-1 flex items-center justify-center gap-1 border border-slate-200
                                   bg-white text-slate-500 rounded-lg px-2 py-2 text-xs font-medium
                                   cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <RotateCcw size={12} />
                        Borrar
                      </button>
                      <button
                        onClick={() => setRefining(true)}
                        className="flex-1 flex items-center justify-center gap-1 border border-[#4285F4]
                                   text-[#4285F4] bg-transparent rounded-lg px-2 py-2 text-xs font-medium
                                   cursor-pointer hover:bg-[#E8F0FE] transition-colors"
                      >
                        <Crop size={12} />
                        Redibujar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Radius section */}
            <div className="p-4 border-b border-slate-100/60">
              <p className="text-xs font-medium text-slate-500 mb-3">Radio de búsqueda</p>
              <RadiusSlider />
            </div>

            {/* Keywords section */}
            <div className="p-4 border-b border-slate-100/60">
              <p className="text-xs font-medium text-slate-500 mb-3">Palabras clave</p>
              <KeywordInput
                keywords={keywords}
                onChange={setKeywords}
                disabled={status === "running"}
              />
              <ProfileSelector
                onSelect={setKeywords}
                currentKeywords={keywords}
                disabled={status === "running"}
              />
            </div>

            {/* Search action */}
            <div className="p-4">
              <SearchActions keywords={keywords} />
            </div>
          </div>
        </aside>
      ) : (
        <button
          onClick={toggleLeft}
          className="absolute top-20 left-4 z-10 w-10 h-10 rounded-full bg-white flex items-center justify-center
                     text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors border-none"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" }}
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Right panel — floating card */}
      {rightOpen ? (
        <aside className="absolute top-4 right-4 z-10 w-[280px] bg-white rounded-xl overflow-hidden"
               style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)", maxHeight: "calc(100vh - 2rem)" }}>
          {/* Panel header with collapse */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-medium text-slate-500">Resultados</span>
            <button onClick={toggleRight}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 cursor-pointer transition-colors border-none bg-transparent">
              <PanelRightClose size={16} />
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 5.5rem)" }}>
            <div className="p-4 border-b border-slate-100/60">
              <p className="text-xs font-medium text-slate-500 mb-3">Progreso</p>
              <ProgressBar />
            </div>
            <div className="p-4 border-b border-slate-100/60">
              <p className="text-xs font-medium text-slate-500 mb-3">Estadísticas</p>
              <SearchStats />
            </div>
            <div className="p-4 border-b border-slate-100/60">
              <ExportButton />
            </div>
            <div className="p-4">
              <p className="text-xs font-medium text-slate-500 mb-3">Historial</p>
              <SearchHistory />
            </div>
          </div>
        </aside>
      ) : (
        <button
          onClick={toggleRight}
          className="absolute top-20 right-4 z-10 w-10 h-10 rounded-full bg-white flex items-center justify-center
                     text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors border-none"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" }}
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Settings + Logout floating buttons */}
      <div className="absolute bottom-7 right-14 z-10 flex gap-2">
        <button
          onClick={() => setShowControl(true)}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center
                     text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors border-none"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" }}
        >
          <Settings size={18} />
        </button>
        <button
          onClick={() => { useAuthStore.getState().clearAuth(); }}
          title="Cerrar sesión"
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center
                     text-slate-500 hover:bg-red-50 hover:text-[#EA4335] cursor-pointer transition-colors border-none"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" }}
        >
          <LogOut size={18} />
        </button>
      </div>

      {showControl && <ControlPanel onClose={() => setShowControl(false)} />}
    </div>
  );
}

function AuthGate() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  useEffect(() => {
    if (token && loading) {
      let cancelled = false;
      getSession(token).then((res) => {
        if (cancelled) return;
        if (res?.token && res?.user) {
          setAuth(res.user, res.token);
        } else {
          clearAuth();
        }
      }).catch(() => {
        if (!cancelled) clearAuth();
      });
      return () => { cancelled = true; };
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">Verificando sesión...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <APIProvider apiKey={MAPS_API_KEY} libraries={["places", "geometry"]}>
      <AppContent />
      <Toast />
    </APIProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
    </QueryClientProvider>
  );
}
