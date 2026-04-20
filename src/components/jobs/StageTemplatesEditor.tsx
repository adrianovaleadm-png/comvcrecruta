import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Stage {
  id: string;
  name: string;
  order_index: number;
}

interface Template {
  stage_id: string;
  assunto: string;
  corpo: string;
  enviar_automatico: boolean;
}

const VARS = ["candidato", "vaga", "empresa"];

const DEFAULTS: Record<string, { assunto: string; corpo: string }> = {
  Recebida: {
    assunto: "Recebemos sua candidatura para {{vaga}}",
    corpo:
      "Olá {{candidato}},\n\nRecebemos sua candidatura para a vaga {{vaga}} na {{empresa}}. Em breve nossa equipe entrará em contato com os próximos passos.\n\nObrigado pelo interesse!\n\nEquipe {{empresa}}",
  },
  Triagem: {
    assunto: "Sua candidatura avançou — {{vaga}}",
    corpo:
      "Olá {{candidato}},\n\nBoas notícias! Seu perfil avançou para a etapa de triagem na vaga {{vaga}}. Vamos analisar seu material com mais detalhes e voltamos em breve.\n\nEquipe {{empresa}}",
  },
  Entrevista: {
    assunto: "Convite para entrevista — {{vaga}}",
    corpo:
      "Olá {{candidato}},\n\nGostaríamos de convidá-lo(a) para uma entrevista referente à vaga {{vaga}}. Entraremos em contato pelos seus dados cadastrados para alinhar data e horário.\n\nEquipe {{empresa}}",
  },
  Case: {
    assunto: "Próxima etapa: case prático — {{vaga}}",
    corpo:
      "Olá {{candidato}},\n\nVocê foi selecionado(a) para a etapa de case prático da vaga {{vaga}}. Em breve enviaremos as instruções e o prazo de entrega.\n\nEquipe {{empresa}}",
  },
  Oferta: {
    assunto: "Temos uma proposta para você — {{vaga}}",
    corpo:
      "Olá {{candidato}},\n\nTemos o prazer de avançar com uma proposta para a vaga {{vaga}}. Nossa equipe entrará em contato para apresentar os detalhes da oferta.\n\nEquipe {{empresa}}",
  },
  Contratada: {
    assunto: "Bem-vindo(a) à {{empresa}}!",
    corpo:
      "Olá {{candidato}},\n\nÉ com grande satisfação que confirmamos sua contratação para a vaga {{vaga}}. Seja muito bem-vindo(a) à {{empresa}}! Em breve enviaremos as informações de onboarding.\n\nEquipe {{empresa}}",
  },
  Reprovada: {
    assunto: "Sobre sua candidatura para {{vaga}}",
    corpo:
      "Olá {{candidato}},\n\nAgradecemos muito seu interesse na vaga {{vaga}} e o tempo dedicado ao nosso processo seletivo. Após análise cuidadosa, optamos por seguir com outros candidatos neste momento.\n\nSeu perfil ficará em nosso banco de talentos para futuras oportunidades.\n\nEquipe {{empresa}}",
  },
};

export default function StageTemplatesEditor({ jobId }: { jobId: string }) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, Template>>({});

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ["stages-for-templates", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stages")
        .select("id, name, order_index")
        .eq("job_id", jobId)
        .order("order_index");
      if (error) throw error;
      return data as Stage[];
    },
  });

  const { data: templates, isLoading: tplLoading } = useQuery({
    queryKey: ["stage-templates", jobId],
    queryFn: async () => {
      if (!stages?.length) return [];
      const { data, error } = await supabase
        .from("stage_templates")
        .select("stage_id, assunto, corpo, enviar_automatico")
        .in(
          "stage_id",
          stages.map((s) => s.id),
        );
      if (error) throw error;
      return data as Template[];
    },
    enabled: !!stages?.length,
  });

  useEffect(() => {
    if (templates) {
      const map: Record<string, Template> = {};
      templates.forEach((t) => (map[t.stage_id] = t));
      setDrafts(map);
    }
  }, [templates]);

  const saveTemplate = useMutation({
    mutationFn: async (t: Template) => {
      const { error } = await supabase
        .from("stage_templates")
        .upsert(t, { onConflict: "stage_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template salvo!");
      queryClient.invalidateQueries({ queryKey: ["stage-templates", jobId] });
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const updateDraft = (stageId: string, patch: Partial<Template>) => {
    setDrafts((prev) => ({ ...prev, [stageId]: { ...prev[stageId], stage_id: stageId, ...patch } }));
  };

  const restoreDefault = (stage: Stage) => {
    const def = DEFAULTS[stage.name];
    if (!def) return;
    updateDraft(stage.id, { ...def, enviar_automatico: true });
    toast.info("Padrão restaurado. Clique em salvar para confirmar.");
  };

  if (stagesLoading || tplLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        Cada template é enviado quando o candidato é movido para a etapa correspondente. Use as
        variáveis:{" "}
        {VARS.map((v) => (
          <Badge key={v} variant="outline" className="mx-0.5 font-mono">
            {`{{${v}}}`}
          </Badge>
        ))}
      </div>

      {stages?.map((stage) => {
        const draft = drafts[stage.id] || {
          stage_id: stage.id,
          assunto: "",
          corpo: "",
          enviar_automatico: true,
        };
        return (
          <div key={stage.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">{stage.name}</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Notificar automaticamente</span>
                <Switch
                  checked={draft.enviar_automatico}
                  onCheckedChange={(v) => updateDraft(stage.id, { enviar_automatico: v })}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Assunto</label>
              <Input
                value={draft.assunto}
                onChange={(e) => updateDraft(stage.id, { assunto: e.target.value })}
                placeholder="Assunto do e-mail"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Corpo</label>
              <Textarea
                rows={6}
                value={draft.corpo}
                onChange={(e) => updateDraft(stage.id, { corpo: e.target.value })}
                placeholder="Conteúdo do e-mail"
                className="font-mono text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => restoreDefault(stage)}
                className="gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Padrão
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => saveTemplate.mutate(draft)}
                disabled={saveTemplate.isPending}
                className="gap-1"
              >
                <Save className="h-3.5 w-3.5" /> Salvar
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
