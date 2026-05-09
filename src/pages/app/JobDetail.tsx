import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Briefcase, Calendar, Kanban, Trophy, ClipboardList, SlidersHorizontal, Users, Building, GraduationCap, Monitor, DollarSign, CalendarClock, Link2, ExternalLink } from "lucide-react";
import FitScoreBadge from "@/components/pipeline/FitScoreBadge";
import { toast } from "sonner";
import { getPublicJobUrl } from "@/lib/publicUrl";

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

const seniorityLabels: Record<string, string> = {
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
  specialist: "Especialista",
  lead: "Liderança",
};

const workModelLabels: Record<string, string> = {
  presencial: "Presencial",
  hibrido: "Híbrido",
  remoto: "Remoto",
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

  const { data: screeningQuestions } = useQuery({
    queryKey: ["screening-questions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screening_questions")
        .select("*")
        .eq("job_id", id!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const WEIGHT_LABELS: Record<string, string> = {
    experiencia: "Experiência",
    habilidades_tecnicas: "Hab. Técnicas",
    localizacao: "Localização",
    senioridade: "Senioridade",
    soft_skills: "Soft Skills",
    triagem: "Triagem",
  };

  if (jobLoading) {
    return <div className="py-12 text-center text-muted-foreground">Carregando...</div>;
  }

  if (!job) {
    return <div className="py-12 text-center text-muted-foreground">Vaga não encontrada.</div>;
  }

  const jobAny = job as any;

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
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
            {jobAny.seniority && (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" /> {seniorityLabels[jobAny.seniority] || jobAny.seniority}
              </span>
            )}
            {jobAny.work_model && (
              <span className="flex items-center gap-1">
                <Monitor className="h-3.5 w-3.5" /> {workModelLabels[jobAny.work_model] || jobAny.work_model}
              </span>
            )}
            {jobAny.department && (
              <span className="flex items-center gap-1">
                <Building className="h-3.5 w-3.5" /> {jobAny.department}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(job.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="gap-2">
          <Link to={`/app/vagas/${id}/pipeline`}>
            <Kanban className="h-4 w-4" /> Ver Pipeline
          </Link>
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link to={`/app/vagas/${id}/editar`}>
            <SlidersHorizontal className="h-4 w-4" /> Editar Vaga
          </Link>
        </Button>
        {job.status === "open" && (
          <>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                const url = `${window.location.origin}/vaga/${id}/candidatar`;
                navigator.clipboard.writeText(url);
                toast.success("Link público copiado!", { description: url });
              }}
            >
              <Link2 className="h-4 w-4" /> Copiar link público
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <a href={`/vaga/${id}/candidatar`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Abrir página de candidatura
              </a>
            </Button>
          </>
        )}
      </div>

      {/* Extra info cards */}
      {(jobAny.salary_min || jobAny.salary_max || jobAny.headcount > 1 || jobAny.deadline || (jobAny.required_skills && jobAny.required_skills.length > 0)) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(jobAny.salary_min || jobAny.salary_max) && (
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <DollarSign className="mx-auto h-4 w-4 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Faixa salarial</p>
              <p className="text-sm font-semibold text-foreground">
                {jobAny.salary_min ? `R$ ${Number(jobAny.salary_min).toLocaleString("pt-BR")}` : "—"}
                {" — "}
                {jobAny.salary_max ? `R$ ${Number(jobAny.salary_max).toLocaleString("pt-BR")}` : "—"}
              </p>
            </div>
          )}
          {jobAny.headcount > 1 && (
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <Users className="mx-auto h-4 w-4 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Vagas</p>
              <p className="text-sm font-semibold text-foreground">{jobAny.headcount}</p>
            </div>
          )}
          {jobAny.deadline && (
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <CalendarClock className="mx-auto h-4 w-4 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Prazo</p>
              <p className="text-sm font-semibold text-foreground">{new Date(jobAny.deadline).toLocaleDateString("pt-BR")}</p>
            </div>
          )}
        </div>
      )}

      {/* Required Skills */}
      {jobAny.required_skills && jobAny.required_skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {jobAny.required_skills.map((skill: string) => (
            <Badge key={skill} variant="secondary">{skill}</Badge>
          ))}
        </div>
      )}

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

      {/* Score Weights */}
      {jobAny.score_weights && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <SlidersHorizontal className="h-4 w-4 text-primary" /> Pesos do Fit Score
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(jobAny.score_weights as Record<string, number>).map(([key, val]) => {
              const total = Object.values(jobAny.score_weights as Record<string, number>).reduce((s: number, v: number) => s + v, 0);
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              return (
                <div key={key} className="rounded-lg border border-border px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">{WEIGHT_LABELS[key] || key}</p>
                  <p className="text-sm font-bold text-foreground">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Screening Questions */}
      {screeningQuestions && screeningQuestions.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <ClipboardList className="h-4 w-4 text-primary" /> Perguntas de Triagem ({screeningQuestions.length})
          </h2>
          <div className="space-y-2">
            {screeningQuestions.map((q: any, idx: number) => (
              <div key={q.id} className="flex items-start gap-2 text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary flex-shrink-0 mt-0.5">{idx + 1}</span>
                <div>
                  <p className="text-foreground">{q.question}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.type === "text" ? "Texto livre" : q.type === "yes_no" ? "Sim/Não" : "Múltipla escolha"}
                    {q.required ? " · Obrigatória" : " · Opcional"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
