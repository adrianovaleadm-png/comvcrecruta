import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.user_type === "candidato") {
        navigate("/candidato", { replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    }
  }, [authLoading, user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Preencha todos os campos."); return; }

    setLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      // Auth state change will handle redirect via App.tsx
    } catch (err: any) {
      setError(err.message === "Invalid login credentials" ? "Email ou senha incorretos." : err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";
  const labelClass = "block text-sm font-medium text-foreground mb-1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-6">Entrar</h1>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className={labelClass}>Email</label>
            <input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
          </div>
          <div>
            <label className={labelClass}>Senha</label>
            <input className={inputClass} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" />
          </div>

          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Não tem conta?{" "}
          <button onClick={() => navigate("/")} className="text-primary font-medium hover:underline">Criar conta</button>
        </p>
      </div>
    </div>
  );
}
