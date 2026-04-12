import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";

export default function CandidatoPlaceholder() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Área do Candidato</h1>
        <p className="text-muted-foreground mb-2">Olá, {profile?.full_name}!</p>
        <p className="text-sm text-muted-foreground mb-8">Esta seção estará disponível em breve.</p>
        <button onClick={signOut} className="flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
    </div>
  );
}
