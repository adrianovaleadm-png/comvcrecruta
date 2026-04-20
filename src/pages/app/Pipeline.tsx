import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback, useRef } from "react";
import { ArrowLeft, Search, Plus, GripVertical, Mail, Phone, Calendar, ClipboardCheck, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import AddCandidateModal from "@/components/pipeline/AddCandidateModal";
import FitScoreBadge from "@/components/pipeline/FitScoreBadge";
import CandidateCompare from "@/components/pipeline/CandidateCompare";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Stage {
  id: string;
  name: string;
  order_index: number;
  job_id: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

interface Application {
  id: string;
  job_id: string;
  candidate_id: string | null;
  stage_id: string;
  status: string;
  created_at: string;
  candidates: Candidate | null;
}

export default function Pipeline() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draggedApp, setDraggedApp] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ appId: string; newStageId: string; stageName: string; notify: boolean } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(value), 300);
  }, []);

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ["pipeline-stages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stages")
        .select("*")
        .eq("job_id", id!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!id,
  });

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ["pipeline-applications", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, candidates(*)")
        .eq("job_id", id!);
      if (error) throw error;
      return data as Application[];
    },
    enabled: !!id,
  });

  const { data: scores } = useQuery({
    queryKey: ["pipeline-scores", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_scores")
        .select("candidate_id, overall_score")
        .eq("job_id", id!);
      if (error) throw error;
      return data as { candidate_id: string; overall_score: number }[];
    },
    enabled: !!id,
  });

  // Fetch screening answer counts per application
  const { data: screeningStatus } = useQuery({
    queryKey: ["pipeline-screening-status", id],
    queryFn: async () => {
      const appIds = applications?.map((a) => a.id) || [];
      if (appIds.length === 0) return [];
      const { data, error } = await supabase
        .from("screening_answers")
        .select("application_id")
        .in("application_id", appIds);
      if (error) throw error;
      return data;
    },
    enabled: !!applications && applications.length > 0,
  });

  const hasScreeningAnswers = (appId: string) =>
    screeningStatus?.some((s) => s.application_id === appId) || false;

  const getScore = (candidateId: string | null) => {
    if (!candidateId || !scores) return undefined;
    return scores.find((s) => s.candidate_id === candidateId)?.overall_score;
  };

  const moveApplication = useMutation({
    mutationFn: async ({ appId, newStageId }: { appId: string; newStageId: string }) => {
      const { error } = await supabase
        .from("applications")
        .update({ stage_id: newStageId })
        .eq("id", appId);
      if (error) throw error;
    },
    onMutate: async ({ appId, newStageId }) => {
      await queryClient.cancelQueries({ queryKey: ["pipeline-applications", id] });
      const prev = queryClient.getQueryData<Application[]>(["pipeline-applications", id]);
      queryClient.setQueryData<Application[]>(["pipeline-applications", id], (old) =>
        old?.map((a) => (a.id === appId ? { ...a, stage_id: newStageId } : a))
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["pipeline-applications", id], context.prev);
      }
      toast.error("Erro ao mover candidato. Tente novamente.");
    },
    onSuccess: () => {
      toast.success("Candidato movido com sucesso!");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-applications", id] });
    },
  });

  const handleDragStart = (appId: string) => setDraggedApp(appId);
  const handleDragEnd = () => {
    setDraggedApp(null);
    setDragOverStage(null);
  };
  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };
  const handleDragLeave = () => setDragOverStage(null);
  const handleDrop = (stageId: string) => {
    if (draggedApp) {
      const app = applications?.find((a) => a.id === draggedApp);
      if (app && app.stage_id !== stageId) {
        moveApplication.mutate({ appId: draggedApp, newStageId: stageId });
      }
    }
    setDraggedApp(null);
    setDragOverStage(null);
  };

  const filteredApps = applications?.filter((app) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      app.candidates?.name?.toLowerCase().includes(q) ||
      app.candidates?.email?.toLowerCase().includes(q)
    );
  });

  const getStageApps = (stageId: string) =>
    filteredApps?.filter((a) => a.stage_id === stageId) || [];

  const isLoading = jobLoading || stagesLoading || appsLoading;
  const hasNoApps = !applications?.length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-4 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-96 w-72 flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (!job) {
    return <div className="py-12 text-center text-muted-foreground">Vaga não encontrada.</div>;
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/vagas" className="hover:text-foreground transition-colors">Hub de Vagas</Link>
        <span>/</span>
        <Link to={`/app/vagas/${id}`} className="hover:text-foreground transition-colors">{job.title}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Pipeline</span>
      </div>

      {/* Actions bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            className="pl-9"
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar candidato
          </Button>
          {selectedForCompare.length >= 2 && (
            <Button variant="outline" onClick={() => setCompareOpen(true)} className="gap-2">
              <Scale className="h-4 w-4" /> Comparar ({selectedForCompare.length})
            </Button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {hasNoApps && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16">
          <p className="mb-2 text-lg font-medium text-foreground">Nenhuma candidatura ainda</p>
          <p className="mb-4 text-sm text-muted-foreground">Adicione candidatos ao pipeline desta vaga.</p>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar candidato
          </Button>
        </div>
      )}

      {/* Kanban */}
      {!hasNoApps && (
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {stages?.map((stage) => {
            const stageApps = getStageApps(stage.id);
            const isDragOver = dragOverStage === stage.id;
            return (
              <div
                key={stage.id}
                className={`flex w-72 flex-shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors ${
                  isDragOver ? "border-primary bg-primary/5" : "border-border"
                }`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(stage.id)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-bold text-primary">
                    {stageApps.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
                  {stageApps.length === 0 && (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                      Sem candidatos nesta etapa
                    </p>
                  )}
                  {stageApps.map((app) => (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={() => handleDragStart(app.id)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${
                        draggedApp === app.id ? "opacity-50 rotate-1 scale-95" : ""
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Checkbox
                          checked={!!app.candidate_id && selectedForCompare.includes(app.candidate_id)}
                          onCheckedChange={(checked) => {
                            if (!app.candidate_id) return;
                            setSelectedForCompare((prev) =>
                              checked ? [...prev.filter((id) => id !== app.candidate_id), app.candidate_id!].slice(0, 3) : prev.filter((id) => id !== app.candidate_id)
                            );
                          }}
                          className="h-3.5 w-3.5"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {app.candidates?.name || "Candidato"}
                        </span>
                      </div>
                      {app.candidates?.email && (
                        <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{app.candidates.email}</span>
                        </div>
                      )}
                      {app.candidates?.phone && (
                        <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{app.candidates.phone}</span>
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(app.created_at).toLocaleDateString("pt-BR")}
                          </div>
                          {hasScreeningAnswers(app.id) && (
                            <span title="Triagem respondida" className="flex items-center text-primary">
                              <ClipboardCheck className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FitScoreBadge
                            score={getScore(app.candidate_id)}
                            candidateId={app.candidate_id || ""}
                            jobId={id!}
                            compact
                          />
                        <Badge
                          variant="outline"
                          className={
                            app.status === "active"
                              ? "text-primary border-primary/30 bg-primary/5"
                              : app.status === "hired"
                              ? "text-success border-success/30 bg-success/5"
                              : "text-destructive border-destructive/30 bg-destructive/5"
                          }
                        >
                          {app.status === "active" ? "Ativo" : app.status === "hired" ? "Contratado" : "Reprovado"}
                        </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddCandidateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        jobId={id!}
        stages={stages || []}
      />
      <CandidateCompare
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        candidateIds={selectedForCompare}
        jobId={id!}
      />
    </div>
  );
}
