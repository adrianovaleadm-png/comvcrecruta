import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Briefcase, Calendar, Kanban, Trophy } from "lucide-react";
import FitScoreBadge from "@/components/pipeline/FitScoreBadge";

const statusLabels: Record<string, string> = {
  open: "Aberta",
  draft: "Rascunho",
  closed: "Fechada",
};

const statusColors: Record<string, string> = {
  open: "bg-success/10 text-success border-success/30",
  draft: "bg-muted text-muted-foreground border-border",
  closed: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: ranking } = useQuery({
    queryKey: ["job-ranking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_scores")
        .select("*, candidates(name, email)")
        .eq("job_id", id!)
        .order("overall_score", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: stages } = useQuery({
    queryKey: ["stages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stages")
        .select("*")
        .eq("job_id", id!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (jobLoading) {
    return <div className="py-12 text-center text-muted-foreground">Carregando...</div>;
  }

  if (!job) {
    return <div className="py-12 text-center text-muted-foreground">Vaga não encontrada.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/vagas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
            <Badge variant="outline" className={statusColors[job.status] || ""}>
              {statusLabels[job.status] || job.status}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {job.location}
              </span>
            )}
            {job.type && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" /> {job.type}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(job.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button asChild className="gap-2">
          <Link to={`/app/vagas/${id}/pipeline`}>
            <Kanban className="h-4 w-4" /> Ver Pipeline
          </Link>
        </Button>
      </div>

      {job.description && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Descrição</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.description}</p>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Etapas do Pipeline</h2>
        <div className="flex flex-wrap gap-2">
          {stages?.map((stage) => (
            <div
              key={stage.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {stage.order_index}
              </span>
              <span className="text-sm font-medium text-foreground">{stage.name}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Ranking */}
      {ranking && ranking.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Trophy className="h-5 w-5 text-primary" /> Ranking de Candidatos
          </h2>
          <div className="space-y-2">
            {ranking.map((r: any, idx: number) => (
              <div key={r.id} className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{r.candidates?.name || "Candidato"}</p>
                  <p className="text-xs text-muted-foreground">{r.ai_summary}</p>
                </div>
                <FitScoreBadge score={r.overall_score} candidateId={r.candidate_id} jobId={id!} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
