import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, Briefcase, Clock, MessageCircle, Sparkles } from "lucide-react";

export default function CandidatoPlaceholder() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">com você, Recruta.</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 mx-auto max-w-3xl w-full px-4 py-10">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Olá, {profile?.full_name?.split(" ")[0] || "candidato(a)"}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Seu portal de candidato está em desenvolvimento.
          </p>
        </div>

        {/* O que virá */}
        <div className="rounded-lg border border-border bg-card p-6 mb-6">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-4">
            O que estará disponível aqui em breve
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Suas candidaturas</p>
                <p className="text-xs text-muted-foreground">
                  Veja todas as vagas para as quais você se candidatou.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Status do processo</p>
                <p className="text-xs text-muted-foreground">
                  Acompanhe em qual etapa você está e o que vem a seguir.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Comunicação e feedback</p>
                <p className="text-xs text-muted-foreground">
                  Mensagens e devolutivas do time de recrutamento em um lugar só.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enquanto isso */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-sm font-semibold text-primary mb-2">Enquanto isso</h2>
          <p className="text-sm text-foreground mb-4">
            Sua candidatura foi recebida e está sob análise. Você será contatado(a) diretamente
            pelo time de recrutamento (por e-mail ou WhatsApp) sobre os próximos passos.
          </p>
          <p className="text-sm text-foreground mb-4">
            Se quiser se candidatar a novas vagas nossa página de carreiras continua aberta:
          </p>
          <Link
            to="/carreiras"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Briefcase className="w-3.5 h-3.5" />
            Ver vagas abertas
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Dúvidas? Responda o e-mail ou WhatsApp que enviamos ao confirmar sua candidatura.
        </p>
      </div>
    </div>
  );
}
