import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  Copy,
  Check,
  Phone,
  ClipboardCheck,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Bookmark,
  MessageSquare,
  Brain,
  Wrench,
  Heart,
} from "lucide-react";
import { toast } from "sonner";

type CaseType = "comportamental" | "tecnico" | "cultural";

const CASE_TYPES: { value: CaseType; label: string; icon: typeof Brain; description: string }[] = [
  { value: "comportamental", label: "Comportamental", icon: Brain, description: "Avalia postura, decisão e comunicação em situações reais" },
  { value: "tecnico", label: "Técnico", icon: Wrench, description: "Exercício prático com entregáveis técnicos da função" },
  { value: "cultural", label: "Cultural", icon: Heart, description: "Avalia alinhamento com missão/valores da empresa" },
];

interface Props {
  applicationId: string;
  jobId: string;
  stageId: string;
}

interface CaseSuggestion {
  level: "basico" | "intermediario" | "avancado" | string;
  title: string;
  description: string;
  evaluates?: string[];
  estimated_time?: string;
}

const LEVEL_LABEL: Record<string, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

const LEVEL_DOT: Record<string, string> = {
  basico: "bg-green-500",
  intermediario: "bg-yellow-500",
  avancado: "bg-red-500",
};

const LEVEL_BORDER: Record<string, string> = {
  basico: "border-green-500/30",
  intermediario: "border-yellow-500/30",
  avancado: "border-red-500/30",
};

function phoneToWhatsapp(phone: string): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  return "55" + digits;
}

function formatDateBR(dateIso: string): string {
  if (!dateIso) return "";
  const [y, m, d] = dateIso.split("-");
  if (!y || !m || !d) return dateIso;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
  return `${weekday}, ${d}/${m}/${y}`;
}

export default function CaseSection({ applicationId, jobId, stageId }: Props) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<CaseSuggestion[] | null>(null);
  const [generatedType, setGeneratedType] = useState<CaseType | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [deadline, setDeadline] = useState("");
  const [copied, setCopied] = useState(false);
  const [caseType, setCaseType] = useState<CaseType>("comportamental");

  // Dados da application + vaga + empresa + candidato
  const { data: ctx } = useQuery({
    queryKey: ["case-section-ctx", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "id, selected_case, selected_case_level, case_selected_at, " +
          "candidates(name, phone), " +
          "jobs(title, companies(nome_fantasia))"
        )
        .eq("id", applicationId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!applicationId,
  });

  // Default case da vaga (stage)
  const { data: stage } = useQuery({
    queryKey: ["case-stage", stageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stages")
        .select("id, name, case_brief")
        .eq("id", stageId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!stageId,
  });

  const selectedCase: string | null = ctx?.selected_case ?? null;
  const selectedLevel: string | null = ctx?.selected_case_level ?? null;
  const stageDefaultCase: string | null = stage?.case_brief ?? null;
  const candidateName = ctx?.candidates?.name ?? "candidato(a)";
  const candidatePhone = ctx?.candidates?.phone ?? "";
  const jobTitle = ctx?.jobs?.title ?? "a vaga";
  const companyName = ctx?.jobs?.companies?.nome_fantasia ?? "";
  const whatsappNumber = phoneToWhatsapp(candidatePhone);

  // Gera sugestoes via IA
  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-case-suggestions", {
        body: { job_id: jobId, case_type: caseType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!Array.isArray(data?.cases)) throw new Error("Resposta inválida da IA.");
      setSuggestions(data.cases);
      setGeneratedType(caseType);
      setExpandedIdx(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar cases.");
    } finally {
      setLoading(false);
    }
  };

  // Seleciona case para o candidato (salva em applications.selected_case)
  const selectCase = async (caseObj: CaseSuggestion) => {
    try {
      const { error } = await supabase
        .from("applications")
        .update({
          selected_case: caseObj.description,
          selected_case_level: caseObj.level,
          case_selected_at: new Date().toISOString(),
        } as any)
        .eq("id", applicationId);
      if (error) throw error;

      // Log no historico
      const typeLabel = CASE_TYPES.find((t) => t.value === (generatedType ?? caseType))?.label ?? "Case";
      await supabase.from("activity_events").insert({
        type: "case_selected",
        entity_type: "application",
        entity_id: applicationId,
        message: `Case "${caseObj.title}" (${typeLabel}, nível ${LEVEL_LABEL[caseObj.level] ?? caseObj.level}) selecionado para o candidato`,
        metadata: { level: caseObj.level, title: caseObj.title, case_type: generatedType ?? caseType },
      });

      queryClient.invalidateQueries({ queryKey: ["case-section-ctx", applicationId] });
      setSuggestions(null);
      toast.success("Case selecionado para este candidato.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao selecionar case.");
    }
  };

  // Promove o case selecionado (ou um da lista) a "padrao da vaga"
  const promoteAsDefault = async (caseText: string) => {
    try {
      const { error } = await supabase
        .from("stages")
        .update({ case_brief: caseText } as any)
        .eq("id", stageId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["case-stage", stageId] });
      toast.success("Definido como case padrão desta etapa da vaga.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao definir padrão.");
    }
  };

  // Usar case padrao da vaga para este candidato
  const useStageDefault = async () => {
    if (!stageDefaultCase) return;
    try {
      const { error } = await supabase
        .from("applications")
        .update({
          selected_case: stageDefaultCase,
          selected_case_level: null,
          case_selected_at: new Date().toISOString(),
        } as any)
        .eq("id", applicationId);
      if (error) throw error;
      await supabase.from("activity_events").insert({
        type: "case_selected",
        entity_type: "application",
        entity_id: applicationId,
        message: "Case padrão da vaga aplicado para este candidato",
        metadata: { source: "stage_default" },
      });
      queryClient.invalidateQueries({ queryKey: ["case-section-ctx", applicationId] });
      toast.success("Case padrão da vaga aplicado.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao aplicar case padrão.");
    }
  };

  // Limpa case selecionado (volta a tela de gerar)
  const clearSelected = async () => {
    try {
      const { error } = await supabase
        .from("applications")
        .update({ selected_case: null, selected_case_level: null, case_selected_at: null } as any)
        .eq("id", applicationId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["case-section-ctx", applicationId] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao trocar case.");
    }
  };

  // Mensagem pronta pra WhatsApp
  const whatsappMessage = useMemo(() => {
    if (!selectedCase) return "";
    const senderName = profile?.full_name || "";
    const companyClause = companyName ? `da ${companyName}` : "do time de Recrutamento";
    const deadlineFmt = deadline ? formatDateBR(deadline) : "[preencher prazo]";

    const lines: string[] = [];
    lines.push(`Olá, ${candidateName}!`);
    lines.push("");
    lines.push(`Tudo bem? Aqui é ${senderName || "do RH"}, ${companyClause}.`);
    lines.push("");
    lines.push(`Parabéns por avançar para a etapa de Case do nosso processo para a vaga de *${jobTitle}*.`);
    lines.push("");
    lines.push("Segue o desafio:");
    lines.push("");
    lines.push("════════════════════════════════════");
    lines.push(selectedCase);
    lines.push("════════════════════════════════════");
    lines.push("");
    lines.push(`*Prazo de entrega:* ${deadlineFmt}`);
    lines.push("*Como entregar:* respondendo essa mensagem com o arquivo ou link da entrega");
    lines.push("");
    lines.push("Em caso de dúvida durante a execução, é só me chamar aqui.");
    lines.push("");
    lines.push("Boa sorte!");
    lines.push("");
    if (senderName) lines.push(senderName);
    if (companyName) lines.push(companyName);
    return lines.join("\n");
  }, [selectedCase, deadline, candidateName, jobTitle, companyName, profile]);

  const copyMessage = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Mensagem copiada.");
  };

  const openWhatsapp = () => {
    if (!whatsappNumber) {
      toast.error("Candidato sem telefone cadastrado.");
      return;
    }
    if (!deadline) {
      toast.error("Defina o prazo de entrega antes de enviar.");
      return;
    }
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ====== RENDER ======

  // ESTADO 1: tem case selecionado para este candidato
  if (selectedCase) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Case desta etapa</div>
              {selectedLevel && (
                <Badge variant="outline" className="mt-1 gap-1">
                  <span className={`h-2 w-2 rounded-full ${LEVEL_DOT[selectedLevel] ?? "bg-muted-foreground"}`} />
                  {LEVEL_LABEL[selectedLevel] ?? selectedLevel}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={clearSelected}>
            <RefreshCw className="h-3 w-3" /> Trocar case
          </Button>
        </div>

        <pre className="whitespace-pre-wrap font-sans rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground max-h-72 overflow-y-auto">
          {selectedCase}
        </pre>

        <div className="space-y-1.5 pt-2 border-t border-border">
          <Label htmlFor="case-deadline" className="text-xs uppercase font-semibold text-muted-foreground">
            Prazo de entrega
          </Label>
          <Input
            id="case-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={copyMessage} disabled={!deadline}>
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiada" : "Copiar mensagem"}
          </Button>
          {whatsappNumber && (
            <Button
              size="sm"
              className="gap-1.5 bg-[#25D366] hover:bg-[#1ebe57] text-white"
              onClick={openWhatsapp}
              disabled={!deadline}
            >
              <Phone className="h-3.5 w-3.5" />
              Enviar via WhatsApp
            </Button>
          )}
          {selectedCase !== stageDefaultCase && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => promoteAsDefault(selectedCase)}
              title="Salvar este case como padrão da vaga para futuros candidatos"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Salvar como padrão da vaga
            </Button>
          )}
        </div>

        {!deadline && (
          <p className="text-xs text-muted-foreground italic">
            Defina o prazo de entrega para habilitar os botões de envio.
          </p>
        )}
      </div>
    );
  }

  // ESTADO 2: sem case selecionado, mas existe case padrão da vaga
  // ESTADO 3: sem case selecionado e sem padrão
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-primary" />
        <div className="text-xs font-semibold uppercase text-muted-foreground">Case desta etapa</div>
      </div>

      {stageDefaultCase && !suggestions && (
        <>
          <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Bookmark className="h-3.5 w-3.5" />
              Case padrão desta vaga
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-foreground max-h-40 overflow-y-auto">
              {stageDefaultCase}
            </pre>
            <Button size="sm" onClick={useStageDefault} className="gap-1.5 w-full sm:w-auto">
              <Check className="h-3.5 w-3.5" /> Usar este case para o candidato
            </Button>
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">Ou gere outros cases com IA:</p>

            {/* Seletor de tipo */}
            <div className="grid grid-cols-3 gap-2">
              {CASE_TYPES.map((t) => {
                const Icon = t.icon;
                const selected = caseType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setCaseType(t.value)}
                    className={`flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors ${
                      selected
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                    title={t.description}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <Button variant="outline" size="sm" onClick={generate} disabled={loading} className="w-full gap-1.5">
              <Sparkles className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading
                ? "Gerando..."
                : `Gerar cases ${CASE_TYPES.find((t) => t.value === caseType)?.label.toLowerCase()} com IA`}
            </Button>
          </div>
        </>
      )}

      {!stageDefaultCase && !suggestions && (
        <>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
            <p>Gere 3 cases sugeridos pela IA — um em cada nível (básico, intermediário, avançado) — e selecione qual enviar a este candidato.</p>
          </div>

          {/* Seletor de tipo de case */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase font-semibold text-muted-foreground">
              Tipo de case
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {CASE_TYPES.map((t) => {
                const Icon = t.icon;
                const selected = caseType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setCaseType(t.value)}
                    className={`flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors ${
                      selected
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                    title={t.description}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground italic px-1">
              {CASE_TYPES.find((t) => t.value === caseType)?.description}
            </p>
          </div>

          <Button onClick={generate} disabled={loading} className="w-full gap-2">
            <Sparkles className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading
              ? "Gerando com IA..."
              : `Sugerir cases ${CASE_TYPES.find((t) => t.value === caseType)?.label.toLowerCase()} com IA`}
          </Button>
        </>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{suggestions.length} sugestões geradas pela IA</p>
              {generatedType && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  {(() => {
                    const t = CASE_TYPES.find((x) => x.value === generatedType);
                    if (!t) return generatedType;
                    const Icon = t.icon;
                    return (
                      <>
                        <Icon className="h-2.5 w-2.5" /> {t.label}
                      </>
                    );
                  })()}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setSuggestions(null)}>
                ← Trocar tipo
              </Button>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={generate} disabled={loading}>
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Regenerar
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {suggestions.map((c, idx) => {
              const isExpanded = expandedIdx === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-md border ${LEVEL_BORDER[c.level] ?? "border-border"} bg-card p-3 space-y-2`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`h-2 w-2 rounded-full ${LEVEL_DOT[c.level] ?? "bg-muted-foreground"}`} />
                        <span className="text-xs font-semibold uppercase">{LEVEL_LABEL[c.level] ?? c.level}</span>
                        {c.estimated_time && (
                          <Badge variant="outline" className="text-[10px] font-normal">{c.estimated_time}</Badge>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">{c.title}</h4>
                      {c.evaluates && c.evaluates.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Avalia: {c.evaluates.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <pre className="whitespace-pre-wrap font-sans rounded-md border border-border bg-muted/30 p-2.5 text-xs text-foreground max-h-60 overflow-y-auto">
                      {c.description}
                    </pre>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {isExpanded ? "Ocultar texto" : "Ver texto completo"}
                    </Button>
                    <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => selectCase(c)}>
                      <Check className="h-3 w-3" />
                      Selecionar este case
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => promoteAsDefault(c.description)}
                      title="Salvar como case padrão desta vaga (sem selecionar para o candidato agora)"
                    >
                      <Bookmark className="h-3 w-3" />
                      Padrão da vaga
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
