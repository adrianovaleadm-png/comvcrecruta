import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  ExternalLink,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Clock,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import FitScoreBadge from "./FitScoreBadge";
import CandidateActionsPanel from "./CandidateActionsPanel";

interface Stage {
  id: string;
  name: string;
  order_index: number;
  sla_dias?: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  applicationId: string | null;
  jobId: string;
  stages: Stage[];
}

export default function CandidateDrawer({
  open,
  onOpenChange,
  applicationId,
  jobId,
  stages,
}: Props) {
  const queryClient = useQueryClient();
  const [moveTo, setMoveTo] = useState<string>("");

  // Application + candidate
  const { data: app, isLoading: loadingApp } = useQuery({
    queryKey: ["drawer-application", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, candidates(*), stages(name, sla_dias)")
        .eq("id", applicationId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!applicationId && open,
  });

  const candidateId = app?.candidate_id ?? null;

  const { data: files } = useQuery({
    queryKey: ["drawer-files", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_files")
        .select("*")
        .eq("candidate_id", candidateId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!candidateId && open,
  });

  const { data: tags } = useQuery({
    queryKey: ["drawer-tags", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_tags")
        .select("tag_id, tags(name)")
        .eq("candidate_id", candidateId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!candidateId && open,
  });

  const { data: score } = useQuery({
    queryKey: ["drawer-score", candidateId, jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_scores")
        .select("*")
        .eq("candidate_id", candidateId!)
        .eq("job_id", jobId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!candidateId && open,
  });

  const { data: questions } = useQuery({
    queryKey: ["drawer-questions", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screening_questions")
        .select("*")
        .eq("job_id", jobId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!jobId && open,
  });

  const { data: answers } = useQuery({
    queryKey: ["drawer-answers", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screening_answers")
        .select("*")
        .eq("application_id", applicationId!);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!applicationId && open,
  });

  const { data: history } = useQuery({
    queryKey: ["drawer-history", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_events")
        .select("*")
        .eq("entity_type", "application")
        .eq("entity_id", applicationId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!applicationId && open,
  });

  const moveMut = useMutation({
    mutationFn: async ({ newStageId }: { newStageId: string }) => {
      const { error } = await supabase
        .from("applications")
        .update({ stage_id: newStageId })
        .eq("id", applicationId!);
      if (error) throw error;
      const { error: fnErr } = await supabase.functions.invoke(
        "send-stage-notification",
        { body: { application_id: applicationId, new_stage_id: newStageId } },
      );
      if (fnErr) console.warn("Notify falhou:", fnErr);
    },
    onSuccess: () => {
      toast.success("Candidato movido.");
      queryClient.invalidateQueries({ queryKey: ["pipeline-applications", jobId] });
      queryClient.invalidateQueries({ queryKey: ["drawer-application", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["drawer-history", applicationId] });
      setMoveTo("");
    },
    onError: () => toast.error("Erro ao mover."),
  });

  const statusMut = useMutation({
    mutationFn: async (status: "hired" | "rejected" | "active") => {
      const { error } = await supabase
        .from("applications")
        .update({ status })
        .eq("id", applicationId!);
      if (error) throw error;
    },
    onSuccess: (_d, status) => {
      toast.success(status === "hired" ? "Marcado como contratado." : status === "rejected" ? "Marcado como reprovado." : "Reativado.");
      queryClient.invalidateQueries({ queryKey: ["pipeline-applications", jobId] });
      queryClient.invalidateQueries({ queryKey: ["drawer-application", applicationId] });
    },
    onError: () => toast.error("Erro ao atualizar status."),
  });

  const candidate = app?.candidates;
  const cv = files?.find((f: any) => f.type === "cv") ?? files?.[0];

  const criteriaEntries = useMemo(() => {
    const cs = (score as any)?.criteria_scores ?? {};
    return Object.entries(cs) as [string, { score: number; nota?: string }][];
  }, [score]);

  const answerByQ = useMemo(() => {
    const map: Record<string, string> = {};
    (answers ?? []).forEach((a: any) => (map[a.question_id] = a.answer));
    return map;
  }, [answers]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        {loadingApp || !app ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SheetTitle className="text-xl">
                    {candidate?.name || "Candidato"}
                  </SheetTitle>
                  <SheetDescription className="flex items-center gap-2 pt-1">
                    <Badge variant="secondary">{app.stages?.name}</Badge>
                    <Badge
                      variant="outline"
                      className={
                        app.status === "active"
                          ? "border-primary/30 bg-primary/5 text-primary"
                          : app.status === "hired"
                          ? "border-success/30 bg-success/5 text-success"
                          : "border-destructive/30 bg-destructive/5 text-destructive"
                      }
                    >
                      {app.status === "active"
                        ? "Ativo"
                        : app.status === "hired"
                        ? "Contratado"
                        : "Reprovado"}
                    </Badge>
                  </SheetDescription>
                </div>
                {candidateId && (
                  <FitScoreBadge
                    score={(score as any)?.overall_score}
                    candidateId={candidateId}
                    jobId={jobId}
                  />
                )}
              </div>
            </SheetHeader>

            <Tabs defaultValue="resumo" className="mt-4">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="score">Score</TabsTrigger>
                <TabsTrigger value="triagem">Triagem</TabsTrigger>
                <TabsTrigger value="processo">Processo</TabsTrigger>
              </TabsList>

              {/* RESUMO */}
              <TabsContent value="resumo" className="space-y-3 pt-3">
                <div className="rounded-lg border border-border bg-card p-3 space-y-2 text-sm">
                  {candidate?.email && (
                    <div className="flex items-center gap-2 text-foreground">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${candidate.email}`} className="hover:text-primary">
                        {candidate.email}
                      </a>
                    </div>
                  )}
                  {candidate?.phone && (
                    <div className="flex items-center gap-2 text-foreground">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {candidate.phone}
                    </div>
                  )}
                  {candidate?.city && (
                    <div className="flex items-center gap-2 text-foreground">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {candidate.city}
                    </div>
                  )}
                  {candidate?.linkedin_url && (
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={candidate.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Perfil no LinkedIn
                      </a>
                    </div>
                  )}
                </div>

                {cv && (
                  <a
                    href={cv.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm hover:border-primary/50"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-foreground">
                      {cv.name || "Currículo"}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}

                {candidate?.summary && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                      Resumo
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {candidate.summary}
                    </p>
                  </div>
                )}

                {tags && tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t: any) => (
                      <Badge key={t.tag_id} variant="secondary">
                        {t.tags?.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {candidateId && (
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link to={`/app/talentos/${candidateId}`}>
                      Abrir perfil completo
                    </Link>
                  </Button>
                )}
              </TabsContent>

              {/* SCORE */}
              <TabsContent value="score" className="space-y-3 pt-3">
                {!score ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Sem avaliação ainda. Clique no badge "Avaliar Fit" no topo.
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                        Pontuação geral
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-foreground">
                          {(score as any).overall_score}%
                        </span>
                      </div>
                    </div>
                    {(score as any).ai_summary && (
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                          <Sparkles className="h-3 w-3" /> Análise IA
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {(score as any).ai_summary}
                        </p>
                      </div>
                    )}
                    {criteriaEntries.length > 0 && (
                      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                        <div className="text-xs font-semibold uppercase text-muted-foreground">
                          Critérios
                        </div>
                        {criteriaEntries.map(([key, val]) => (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="capitalize text-foreground">{key}</span>
                              <span className="font-medium text-foreground">
                                {val.score}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${Math.min(100, val.score)}%` }}
                              />
                            </div>
                            {val.nota && (
                              <p className="text-xs text-muted-foreground">{val.nota}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* TRIAGEM */}
              <TabsContent value="triagem" className="space-y-2 pt-3">
                {!questions || questions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Nenhuma pergunta de triagem configurada para esta vaga.
                  </p>
                ) : (
                  questions.map((q: any) => (
                    <div
                      key={q.id}
                      className="rounded-lg border border-border bg-card p-3"
                    >
                      <div className="text-xs font-medium text-muted-foreground">
                        {q.question}
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {answerByQ[q.id] ? (
                          answerByQ[q.id]
                        ) : (
                          <span className="italic text-muted-foreground">
                            Sem resposta
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* PROCESSO */}
              <TabsContent value="processo" className="space-y-3 pt-3">
                <CandidateActionsPanel
                  applicationId={app.id}
                  stageId={app.stage_id}
                  movedAt={app.updated_at || app.created_at}
                />

                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Histórico
                  </div>
                  {!history || history.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Sem eventos registrados.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {history.map((h) => (
                        <li
                          key={h.id}
                          className="flex gap-2 border-l-2 border-border pl-3 text-xs"
                        >
                          <Clock className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="text-foreground">{h.message}</div>
                            <div className="text-muted-foreground">
                              {new Date(h.created_at).toLocaleString("pt-BR")}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer actions */}
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <div className="flex gap-2">
                <Select value={moveTo} onValueChange={setMoveTo}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Mover para etapa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stages
                      .filter((s) => s.id !== app.stage_id)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!moveTo || moveMut.isPending}
                  onClick={() => moveMut.mutate({ newStageId: moveTo })}
                  className="gap-1"
                >
                  <ArrowRight className="h-4 w-4" /> Mover
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="gap-1 border-success/40 text-success hover:bg-success/10"
                  disabled={statusMut.isPending || app.status === "hired"}
                  onClick={() => statusMut.mutate("hired")}
                >
                  <CheckCircle2 className="h-4 w-4" /> Contratar
                </Button>
                <Button
                  variant="outline"
                  className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                  disabled={statusMut.isPending || app.status === "rejected"}
                  onClick={() => statusMut.mutate("rejected")}
                >
                  <XCircle className="h-4 w-4" /> Reprovar
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
