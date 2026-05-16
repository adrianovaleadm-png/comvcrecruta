import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, CheckCircle2, User, AlertTriangle, Calendar } from "lucide-react";
import ScheduleInterviewModal from "./ScheduleInterviewModal";

/**
 * Acoes do checklist relacionadas a agendamento de entrevista/call.
 * Quando o usuario clica no checkbox dessas acoes (estando desmarcadas),
 * abre o modal de agendamento em vez de so marcar.
 */
function isSchedulingAction(acao: string): boolean {
  return /agendar.*(call|presencial|entrevista|reuni|conversa)/i.test(acao);
}

interface Props {
  applicationId: string;
  stageId: string;
  movedAt?: string; // when the application entered this stage (fallback: created_at)
}

interface ChecklistRow {
  id: string;
  acao: string;
  concluido: boolean;
}

export default function CandidateActionsPanel({ applicationId, stageId, movedAt }: Props) {
  const queryClient = useQueryClient();
  const [schedulingItemId, setSchedulingItemId] = useState<string | null>(null);

  const { data: stage } = useQuery({
    queryKey: ["stage-playbook", stageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stages")
        .select("id, name, objetivo, acoes, criterios_avanco, sla_dias, responsavel_padrao")
        .eq("id", stageId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!stageId,
  });

  const { data: checklist } = useQuery({
    queryKey: ["app-checklist", applicationId, stageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_checklist")
        .select("id, acao, concluido")
        .eq("application_id", applicationId)
        .eq("stage_id", stageId)
        .order("created_at");
      if (error) throw error;
      return data as ChecklistRow[];
    },
    enabled: !!applicationId && !!stageId,
  });

  const defaultActions = useMemo(
    () => (stage?.acoes ?? "").split("\n").map((a) => a.trim()).filter(Boolean),
    [stage?.acoes],
  );

  // Seed checklist from playbook actions if empty
  useEffect(() => {
    if (!stage || !checklist || checklist.length > 0 || defaultActions.length === 0) return;
    (async () => {
      const rows = defaultActions.map((acao) => ({ application_id: applicationId, stage_id: stageId, acao }));
      const { error } = await supabase.from("application_checklist").insert(rows);
      if (!error) queryClient.invalidateQueries({ queryKey: ["app-checklist", applicationId, stageId] });
    })();
  }, [stage, checklist, defaultActions, applicationId, stageId, queryClient]);

  const toggle = useMutation({
    mutationFn: async ({ id, concluido }: { id: string; concluido: boolean }) => {
      const { error } = await supabase
        .from("application_checklist")
        .update({ concluido, concluido_em: concluido ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["app-checklist", applicationId, stageId] }),
  });

  if (!stage) return null;

  const daysInStage = movedAt
    ? Math.floor((Date.now() - new Date(movedAt).getTime()) / 86_400_000)
    : null;
  const overSla = stage.sla_dias != null && daysInStage != null && daysInStage > stage.sla_dias;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Etapa atual</div>
          <div className="text-base font-semibold text-foreground">{stage.name}</div>
        </div>
        {stage.sla_dias != null && (
          <Badge variant={overSla ? "destructive" : "secondary"} className="gap-1">
            {overSla && <AlertTriangle className="h-3 w-3" />}
            <Clock className="h-3 w-3" />
            {daysInStage ?? 0}/{stage.sla_dias}d
          </Badge>
        )}
      </div>

      {stage.objetivo && (
        <div className="flex gap-2 rounded-md bg-muted/50 p-2.5 text-xs">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="text-muted-foreground">{stage.objetivo}</span>
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Próximas ações</div>
        {!checklist?.length && (
          <p className="text-xs text-muted-foreground">Sem ações definidas para esta etapa.</p>
        )}
        <div className="space-y-1.5">
          {checklist?.map((c) => {
            const isScheduling = isSchedulingAction(c.acao);
            return (
              <div key={c.id} className="group flex items-start gap-2 rounded-md p-1.5 hover:bg-muted/50">
                <Checkbox
                  checked={c.concluido}
                  onCheckedChange={(v) => {
                    // Se for acao de agendar e estiver marcando agora, abre modal
                    if (v && isScheduling && !c.concluido) {
                      setSchedulingItemId(c.id);
                    } else {
                      toggle.mutate({ id: c.id, concluido: !!v });
                    }
                  }}
                  className="mt-0.5"
                />
                <div className="flex flex-1 items-center gap-2">
                  <span className={`flex-1 text-sm ${c.concluido ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {c.acao}
                  </span>
                  {isScheduling && !c.concluido && (
                    <button
                      type="button"
                      onClick={() => setSchedulingItemId(c.id)}
                      className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 transition-colors"
                      title="Agendar e gerar mensagem para WhatsApp"
                    >
                      <Calendar className="h-3 w-3" />
                      Agendar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {schedulingItemId && (
          <ScheduleInterviewModal
            open={!!schedulingItemId}
            onOpenChange={(v) => {
              if (!v) setSchedulingItemId(null);
            }}
            applicationId={applicationId}
            checklistItemId={schedulingItemId}
          />
        )}
      </div>

      {stage.criterios_avanco && (
        <div className="flex gap-2 rounded-md border border-border p-2.5 text-xs">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
          <div>
            <div className="font-medium text-foreground">Critérios de avanço</div>
            <div className="text-muted-foreground">{stage.criterios_avanco}</div>
          </div>
        </div>
      )}

      {stage.responsavel_padrao && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          Responsável: <span className="font-medium text-foreground">{stage.responsavel_padrao}</span>
        </div>
      )}
    </div>
  );
}
