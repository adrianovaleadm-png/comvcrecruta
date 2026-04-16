import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, ArrowRight, Clock, Users, TrendingUp, CheckCircle, XCircle } from "lucide-react";

interface FunnelMetrics {
  funnel: { stageName: string; count: number }[];
  conversions: { from: string; to: string; rate: number }[];
  avgTimePerStage: { stageName: string; avgHours: number | null; transitions: number }[];
  summary: { totalApps: number; hired: number; rejected: number; active: number; hireRate: number };
}

export default function Analytics() {
  const [jobId, setJobId] = useState<string>("");
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: jobs } = useQuery({
    queryKey: ["all-jobs-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("id, title").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (jobId) params.set("job_id", jobId);
      const { data, error } = await supabase.functions.invoke("get-funnel-metrics?" + params.toString(), { method: "GET" } as any);
      if (!error && data) setMetrics(data as FunnelMetrics);
      setLoading(false);
    })();
  }, [jobId]);

  const maxCount = metrics?.funnel ? Math.max(...metrics.funnel.map((f) => f.count), 1) : 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Métricas e conversão do funil de recrutamento.</p>
        </div>
      <Select value={jobId || "all"} onValueChange={(v) => setJobId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Todas as vagas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as vagas</SelectItem>
            {jobs?.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Total", value: metrics.summary.totalApps, icon: Users },
            { label: "Ativos", value: metrics.summary.active, icon: TrendingUp },
            { label: "Contratados", value: metrics.summary.hired, icon: CheckCircle },
            { label: "Reprovados", value: metrics.summary.rejected, icon: XCircle },
            { label: "Taxa Contratação", value: `${metrics.summary.hireRate}%`, icon: BarChart3 },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Funil de Candidatos
          </h2>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : metrics?.funnel.map((s) => (
            <div key={s.stageName} className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">{s.stageName}</span>
                <span className="font-medium text-foreground">{s.count}</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(s.count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Conversions */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" /> Conversão entre Etapas
          </h2>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : metrics?.conversions.map((c, i) => (
            <div key={i} className="flex items-center gap-3 mb-3 rounded-lg border border-border p-3">
              <span className="text-sm text-muted-foreground flex-1">{c.from}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground flex-1">{c.to}</span>
              <span className={`text-sm font-bold ${c.rate >= 50 ? "text-primary" : c.rate >= 20 ? "text-yellow-500" : "text-destructive"}`}>
                {c.rate}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Avg time per stage */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> Tempo Médio por Etapa
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {metrics?.avgTimePerStage.map((s) => (
              <div key={s.stageName} className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{s.stageName}</p>
                <p className="text-lg font-bold text-foreground">
                  {s.avgHours != null ? (s.avgHours < 24 ? `${s.avgHours}h` : `${Math.round(s.avgHours / 24)}d`) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{s.transitions} transições</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
