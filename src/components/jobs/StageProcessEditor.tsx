import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { RotateCcw, Save, Clock, Target, ListChecks, CheckCircle2, User } from "lucide-react";

interface Stage {
  id: string;
  name: string;
  order_index: number;
  objetivo: string | null;
  acoes: string | null;
  criterios_avanco: string | null;
  sla_dias: number | null;
  responsavel_padrao: string | null;
}

interface Props {
  jobId: string;
}

type StageDraft = Pick<Stage, "objetivo" | "acoes" | "criterios_avanco" | "sla_dias" | "responsavel_padrao">;

export default function StageProcessEditor({ jobId }: Props) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, StageDraft>>({});

  const { data: stages, isLoading } = useQuery({
    queryKey: ["stages-playbook", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stages")
        .select("id, name, order_index, objetivo, acoes, criterios_avanco, sla_dias, responsavel_padrao")
        .eq("job_id", jobId)
        .order("order_index");
      if (error) throw error;
      return data as Stage[];
    },
  });

  useEffect(() => {
    if (stages) {
      const map: Record<string, StageDraft> = {};
      stages.forEach((s) => {
        map[s.id] = {
          objetivo: s.objetivo ?? "",
          acoes: s.acoes ?? "",
          criterios_avanco: s.criterios_avanco ?? "",
          sla_dias: s.sla_dias,
          responsavel_padrao: s.responsavel_padrao ?? "",
        };
      });
      setDrafts(map);
    }
  }, [stages]);

  const updateDraft = (id: string, patch: Partial<StageDraft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const saveStage = useMutation({
    mutationFn: async ({ id, draft }: { id: string; draft: StageDraft }) => {
      const { error } = await supabase
        .from("stages")
        .update({
          objetivo: draft.objetivo || null,
          acoes: draft.acoes || null,
          criterios_avanco: draft.criterios_avanco || null,
          sla_dias: draft.sla_dias,
          responsavel_padrao: draft.responsavel_padrao || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Etapa salva!");
      queryClient.invalidateQueries({ queryKey: ["stages-playbook", jobId] });
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const restoreDefault = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase.rpc("default_playbook_for_stage", { _stage_name: name });
      if (error) throw error;
      const pb = data?.[0];
      if (!pb) throw new Error("Sem padrão para esta etapa.");
      const { error: upErr } = await supabase
        .from("stages")
        .update({
          objetivo: pb.objetivo,
          acoes: pb.acoes,
          criterios_avanco: pb.criterios_avanco,
          sla_dias: pb.sla_dias,
          responsavel_padrao: pb.responsavel_padrao,
        })
        .eq("id", id);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      toast.success("Padrão restaurado!");
      queryClient.invalidateQueries({ queryKey: ["stages-playbook", jobId] });
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;
  if (!stages?.length) return <div className="py-8 text-center text-muted-foreground">Sem etapas.</div>;

  return (
    <Accordion type="multiple" defaultValue={[stages[0].id]} className="space-y-2">
      {stages.map((stage) => {
        const d = drafts[stage.id];
        if (!d) return null;
        return (
          <AccordionItem key={stage.id} value={stage.id} className="rounded-lg border border-border bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {stage.order_index}
                </span>
                <span className="font-medium text-foreground">{stage.name}</span>
                {d.sla_dias != null && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {d.sla_dias}d
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div>
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <Target className="h-3.5 w-3.5" /> Objetivo da etapa
                </Label>
                <Input
                  className="mt-1.5"
                  placeholder="O que se busca nesta fase?"
                  value={d.objetivo ?? ""}
                  onChange={(e) => updateDraft(stage.id, { objetivo: e.target.value })}
                />
              </div>

              <div>
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <ListChecks className="h-3.5 w-3.5" /> Ações do recrutador (uma por linha)
                </Label>
                <Textarea
                  rows={5}
                  className="mt-1.5 font-mono text-xs"
                  placeholder={"Conferir CV\nValidar requisitos mínimos\n..."}
                  value={d.acoes ?? ""}
                  onChange={(e) => updateDraft(stage.id, { acoes: e.target.value })}
                />
              </div>

              <div>
                <Label className="flex items-center gap-1.5 text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Critérios de avanço
                </Label>
                <Textarea
                  rows={2}
                  className="mt-1.5"
                  placeholder="O que o candidato precisa atender para avançar"
                  value={d.criterios_avanco ?? ""}
                  onChange={(e) => updateDraft(stage.id, { criterios_avanco: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-1.5 text-xs font-medium">
                    <Clock className="h-3.5 w-3.5" /> SLA (dias)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    className="mt-1.5"
                    placeholder="Sem prazo"
                    value={d.sla_dias ?? ""}
                    onChange={(e) =>
                      updateDraft(stage.id, { sla_dias: e.target.value ? parseInt(e.target.value) : null })
                    }
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5 text-xs font-medium">
                    <User className="h-3.5 w-3.5" /> Responsável padrão
                  </Label>
                  <Input
                    className="mt-1.5"
                    placeholder="Recrutador / Gestor / RH"
                    value={d.responsavel_padrao ?? ""}
                    onChange={(e) => updateDraft(stage.id, { responsavel_padrao: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  disabled={restoreDefault.isPending}
                  onClick={() => restoreDefault.mutate({ id: stage.id, name: stage.name })}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={saveStage.isPending}
                  onClick={() => saveStage.mutate({ id: stage.id, draft: d })}
                >
                  <Save className="h-3.5 w-3.5" /> Salvar
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
