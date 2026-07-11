import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import QueryErrorState from "@/components/ui/QueryErrorState";
import {
  LogOut,
  User,
  Briefcase,
  Clock,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Building2,
  Calendar,
} from "lucide-react";

// Cores por status (Ativo / Contratado / Reprovado)
const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  active: { label: "Em andamento", bg: "bg-primary/10", text: "text-primary", icon: Clock },
  hired: { label: "Contratado(a)", bg: "bg-success/10", text: "text-success", icon: CheckCircle2 },
  rejected: { label: "Encerrado", bg: "bg-muted", text: "text-muted-foreground", icon: XCircle },
};

function formatDateBR(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function CandidatoDashboard() {
  const { profile, signOut } = useAuth();

  // 1) Descobre os candidate_ids que correspondem ao e-mail do usuario logado.
  //    (relacao entre auth user e tabela candidates e feita por e-mail)
  const {
    data: candidateIds,
    isLoading: loadingCands,
    isError: errorCands,
    error: errCandsObj,
    refetch: refetchCands,
  } = useQuery({
    queryKey: ["candidato-me", profile?.email],
    queryFn: async () => {
      if (!profile?.email) return [] as string[];
      const { data, error } = await supabase
        .from("candidates")
        .select("id")
        .eq("email", profile.email);
      if (error) throw error;
      return (data ?? []).map((c) => c.id as string);
    },
    enabled: !!profile?.email,
  });

  // 2) Busca as candidaturas desses candidate_ids.
  const {
    data: applications,
    isLoading: loadingApps,
    isError: errorApps,
    error: errAppsObj,
    refetch: refetchApps,
  } = useQuery({
    queryKey: ["candidato-apps", candidateIds],
    queryFn: async () => {
      if (!candidateIds || candidateIds.length === 0) return [];
      const { data, error } = await supabase
        .from("applications")
        .select(
          "id, status, created_at, updated_at, " +
          "jobs(title, companies(nome_fantasia)), " +
          "stages(name, order_index)"
        )
        .in("candidate_id", candidateIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Array.isArray(candidateIds) && candidateIds.length > 0,
  });

  const loading = loadingCands || loadingApps;
  const hasError = errorCands || errorApps;
  const hasApplications = (applications?.length ?? 0) > 0;

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
      <div className="flex-1 mx-auto max-w-3xl w-full px-4 py-8">
        {/* Saudação */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Olá, {profile?.full_name?.split(" ")[0] || "candidato(a)"}!
              </h1>
              <p className="text-sm text-muted-foreground">Bem-vindo(a) à sua área do candidato.</p>
            </div>
          </div>
        </div>

        {/* Estado: carregando */}
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* Estado: erro */}
        {!loading && hasError && (
          <QueryErrorState
            title="Não conseguimos carregar suas candidaturas"
            description="Houve um problema. Tente recarregar."
            error={errCandsObj ?? errAppsObj}
            onRetry={() => {
              refetchCands();
              refetchApps();
            }}
          />
        )}

        {/* Estado: com candidaturas */}
        {!loading && !hasError && hasApplications && (
          <>
            <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">
              Suas candidaturas ({applications!.length})
            </h2>
            <div className="space-y-3">
              {applications!.map((app: any) => {
                const status = STATUS_STYLES[app.status] ?? STATUS_STYLES.active;
                const StatusIcon = status.icon;
                const jobTitle = app.jobs?.title || "Vaga";
                const companyName = app.jobs?.companies?.nome_fantasia || "—";
                const stageName = app.stages?.name || "—";
                return (
                  <div
                    key={app.id}
                    className="rounded-lg border border-border bg-card p-5 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-foreground truncate">{jobTitle}</h3>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <Building2 className="w-3.5 h-3.5" />
                          <span className="truncate">{companyName}</span>
                        </div>
                      </div>
                      <div
                        className={`flex items-center gap-1 rounded-full ${status.bg} ${status.text} px-2.5 py-1 text-[11px] font-medium flex-shrink-0`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </div>
                    </div>

                    <div className="grid gap-2 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <ArrowRight className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-muted-foreground">Etapa atual:</span>
                        <span className="font-medium text-foreground">{stageName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-muted-foreground">Candidatura enviada em:</span>
                        <span className="text-foreground">{formatDateBR(app.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rodapé de dicas + link para carreiras */}
            <div className="mt-8 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm text-foreground mb-2">
                <strong>Dica:</strong> avisos sobre próximos passos serão enviados por e-mail
                ou WhatsApp diretamente pelo time de recrutamento.
              </p>
              <Link
                to="/carreiras"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Briefcase className="w-3.5 h-3.5" /> Ver outras vagas abertas
              </Link>
            </div>
          </>
        )}

        {/* Estado: sem candidaturas */}
        {!loading && !hasError && !hasApplications && (
          <>
            {/* Card explicando o que virá */}
            <div className="rounded-lg border border-border bg-card p-6 mb-6">
              <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-4">
                Você ainda não tem candidaturas
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Assim que se candidatar a uma vaga, ela aparecerá aqui — junto com o status e
                os próximos passos do processo.
              </p>
              <Link
                to="/carreiras"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Briefcase className="w-3.5 h-3.5" /> Ver vagas abertas
              </Link>
            </div>

            {/* O que virá aqui */}
            <div className="rounded-lg border border-border bg-card p-6">
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
          </>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Dúvidas? Responda o e-mail ou WhatsApp que enviamos ao confirmar sua candidatura.
        </p>
      </div>
    </div>
  );
}
