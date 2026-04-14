import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Users, BarChart3, TrendingUp, Clock, AlertTriangle, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardData {
  kpis: {
    openJobs: number;
    activeCandidates: number;
    hiredThisMonth: number;
    conversionRateThisMonth: number;
    avgTimeToCloseDays: number | null;
    pendingItems: number;
  };
  funnel: { stageName: string; count: number }[];
  recentActivity: { message: string; created_at: string }[];
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days}d`;
}

export default function Painel() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const { data: res, error: err } = await supabase.functions.invoke("get-dashboard-overview");
      if (err) {
        setError("Não foi possível carregar o painel.");
        console.error(err);
      } else {
        setData(res as DashboardData);
      }
      setLoading(false);
    })();
  }, []);

  const kpis = data?.kpis;

  const cards = [
    { label: "Vagas Abertas", value: kpis?.openJobs ?? 0, icon: Briefcase },
    { label: "Candidatos Ativos", value: kpis?.activeCandidates ?? 0, icon: Users },
    { label: "Contratados (mês)", value: kpis?.hiredThisMonth ?? 0, icon: BarChart3 },
    { label: "Conversão (mês)", value: `${kpis?.conversionRateThisMonth ?? 0}%`, icon: TrendingUp },
    { label: "Tempo Médio (dias)", value: kpis?.avgTimeToCloseDays != null ? kpis.avgTimeToCloseDays : "—", icon: Clock },
    { label: "Pendências", value: kpis?.pendingItems ?? 0, icon: AlertTriangle },
  ];

  const maxFunnelCount = data?.funnel ? Math.max(...data.funnel.map((f) => f.count), 1) : 1;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground mb-1">Painel</h1>
      <p className="text-sm text-muted-foreground mb-8">Visão geral do recrutamento.</p>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((c) =>
          loading ? (
            <div key={c.label} className="p-5 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ) : (
            <div key={c.label} className="p-5 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <c.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold text-card-foreground">{c.value}</p>
            </div>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Funil de Candidatos</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !data?.funnel || data.funnel.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma etapa encontrada. Crie uma vaga para ver o funil.</p>
          ) : (
            <div className="space-y-3">
              {data.funnel.map((stage) => (
                <div key={stage.stageName}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{stage.stageName}</span>
                    <span className="font-medium text-card-foreground">{stage.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${(stage.count / maxFunnelCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-card-foreground">Atividade Recente</h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-2 w-2 mt-2 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data?.recentActivity || data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((ev, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-2 w-2 mt-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-sm text-card-foreground">{ev.message}</p>
                    <p className="text-xs text-muted-foreground">{relativeTime(ev.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
