import { Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function VerifyEmail() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Verifique seu email</h1>
        <p className="text-muted-foreground mb-6">
          Enviamos um link de confirmação para o seu email. Clique no link para ativar sua conta e começar a usar a plataforma.
        </p>
        <button onClick={() => navigate("/login")} className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition">
          Ir para Login
        </button>
      </div>
    </div>
  );
}
