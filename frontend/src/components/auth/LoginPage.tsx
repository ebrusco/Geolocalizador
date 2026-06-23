import { useState } from "react";
import { Eye, EyeOff, Loader2, MapPin, ArrowLeft } from "lucide-react";
import { signIn, signUp, forgotPassword } from "../../lib/auth";
import { useAuthStore } from "../../stores/authStore";

type View = "login" | "register" | "forgot" | "forgot-sent";

export function LoginPage() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn(email, password);
      setAuth(res.user, res.token);
    } catch (err: any) {
      setError(err.message || "Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      const res = await signUp(email, password, name);
      setAuth(res.user, res.token);
    } catch (err: any) {
      setError(err.message || "Error al crear cuenta");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setView("forgot-sent");
    } catch (err: any) {
      setError(err.message || "Error al enviar email");
    } finally {
      setLoading(false);
    }
  };

  const switchView = (v: View) => {
    setError("");
    setView(v);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#4285F4] mb-3">
            <MapPin size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">ProspectoAI</h1>
          <p className="text-sm text-slate-400 mt-1">Prospección geoespacial inteligente</p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl p-6"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" }}
        >
          {view === "login" && (
            <>
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Iniciar sesión</h2>
              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm
                             text-slate-700 placeholder:text-slate-400
                             focus:outline-none focus:border-[#4285F4] focus:ring-1 focus:ring-[#4285F4]
                             transition-colors"
                />
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm
                               text-slate-700 placeholder:text-slate-400
                               focus:outline-none focus:border-[#4285F4] focus:ring-1 focus:ring-[#4285F4]
                               transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400
                               hover:text-slate-600 bg-transparent border-none cursor-pointer"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && (
                  <p className="text-xs text-[#EA4335] bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-[#4285F4] text-white text-sm font-medium
                             hover:bg-[#3367D6] disabled:opacity-50 cursor-pointer border-none
                             transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Entrar
                </button>
              </form>

              <div className="mt-4 flex justify-between">
                <button
                  onClick={() => switchView("forgot")}
                  className="text-xs text-[#4285F4] hover:text-[#3367D6] bg-transparent border-none
                             cursor-pointer transition-colors"
                >
                  Olvidé mi contraseña
                </button>
                <button
                  onClick={() => switchView("register")}
                  className="text-xs text-[#4285F4] hover:text-[#3367D6] bg-transparent border-none
                             cursor-pointer transition-colors"
                >
                  Crear cuenta
                </button>
              </div>
            </>
          )}

          {view === "register" && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => switchView("login")}
                  className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                >
                  <ArrowLeft size={16} />
                </button>
                <h2 className="text-sm font-semibold text-slate-700">Crear cuenta</h2>
              </div>
              <form onSubmit={handleRegister} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm
                             text-slate-700 placeholder:text-slate-400
                             focus:outline-none focus:border-[#4285F4] focus:ring-1 focus:ring-[#4285F4]
                             transition-colors"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm
                             text-slate-700 placeholder:text-slate-400
                             focus:outline-none focus:border-[#4285F4] focus:ring-1 focus:ring-[#4285F4]
                             transition-colors"
                />
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder="Contraseña (mín. 8 caracteres)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm
                               text-slate-700 placeholder:text-slate-400
                               focus:outline-none focus:border-[#4285F4] focus:ring-1 focus:ring-[#4285F4]
                               transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400
                               hover:text-slate-600 bg-transparent border-none cursor-pointer"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && (
                  <p className="text-xs text-[#EA4335] bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-[#4285F4] text-white text-sm font-medium
                             hover:bg-[#3367D6] disabled:opacity-50 cursor-pointer border-none
                             transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Crear cuenta
                </button>
              </form>
            </>
          )}

          {view === "forgot" && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => switchView("login")}
                  className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                >
                  <ArrowLeft size={16} />
                </button>
                <h2 className="text-sm font-semibold text-slate-700">Recuperar contraseña</h2>
              </div>
              <form onSubmit={handleForgot} className="space-y-3">
                <p className="text-xs text-slate-500">
                  Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
                </p>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm
                             text-slate-700 placeholder:text-slate-400
                             focus:outline-none focus:border-[#4285F4] focus:ring-1 focus:ring-[#4285F4]
                             transition-colors"
                />

                {error && (
                  <p className="text-xs text-[#EA4335] bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-[#4285F4] text-white text-sm font-medium
                             hover:bg-[#3367D6] disabled:opacity-50 cursor-pointer border-none
                             transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Enviar link
                </button>
              </form>
            </>
          )}

          {view === "forgot-sent" && (
            <div className="text-center py-4">
              <p className="text-sm text-slate-700 font-medium mb-2">Email enviado</p>
              <p className="text-xs text-slate-500 mb-4">
                Si existe una cuenta con ese email, recibirás un link para restablecer tu contraseña.
              </p>
              <button
                onClick={() => switchView("login")}
                className="text-xs text-[#4285F4] hover:text-[#3367D6] bg-transparent border-none
                           cursor-pointer transition-colors"
              >
                Volver al login
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          ProspectoAI v2 &middot; Prospección geoespacial
        </p>
      </div>
    </div>
  );
}
