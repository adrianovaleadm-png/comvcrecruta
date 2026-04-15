import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ScreeningQuestion {
  question: string;
  type: "text" | "choice" | "yes_no";
  options: string[];
  required: boolean;
}

interface Props {
  questions: ScreeningQuestion[];
  onChange: (questions: ScreeningQuestion[]) => void;
  jobTitle?: string;
  jobDescription?: string;
}

const SUGGESTED_QUESTIONS: ScreeningQuestion[] = [
  { question: "Qual sua pretensão salarial?", type: "text", options: [], required: true },
  { question: "Tem disponibilidade imediata?", type: "yes_no", options: [], required: true },
  { question: "Descreva sua experiência relevante para esta vaga.", type: "text", options: [], required: true },
];

export default function ScreeningQuestionsBuilder({ questions, onChange, jobTitle, jobDescription }: Props) {
  const [newOption, setNewOption] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateWithAI = async () => {
    if (!jobTitle?.trim()) {
      toast.error("Preencha o título da vaga antes de gerar perguntas com IA.");
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-screening-questions", {
        body: { title: jobTitle, description: jobDescription },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const generated: ScreeningQuestion[] = (data.questions || []).map((q: any) => ({
        question: q.question || "",
        type: q.type === "choice" || q.type === "yes_no" ? q.type : "text",
        options: Array.isArray(q.options) ? q.options : [],
        required: q.required !== false,
      }));
      onChange([...questions, ...generated]);
      toast.success(`${generated.length} perguntas geradas com IA!`);
    } catch (e: any) {
      console.error("AI screening generation error:", e);
      toast.error(e?.message || "Erro ao gerar perguntas. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const add = () => {
    onChange([...questions, { question: "", type: "text", options: [], required: true }]);
  };

  const remove = (idx: number) => {
    onChange(questions.filter((_, i) => i !== idx));
  };

  const update = (idx: number, patch: Partial<ScreeningQuestion>) => {
    onChange(questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= questions.length) return;
    const arr = [...questions];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    onChange(arr);
  };

  const addOption = (idx: number) => {
    if (!newOption.trim()) return;
    update(idx, { options: [...questions[idx].options, newOption.trim()] });
    setNewOption("");
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    update(qIdx, { options: questions[qIdx].options.filter((_, i) => i !== oIdx) });
  };

  const addSuggested = () => {
    onChange([...questions, ...SUGGESTED_QUESTIONS]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Perguntas de Triagem</h3>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={generateWithAI} disabled={isGenerating} className="gap-1 text-xs">
            <Sparkles className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Gerando…" : "Gerar com IA"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addSuggested} className="text-xs">
            Sugeridas
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1 text-xs">
            <Plus className="h-3 w-3" /> Pergunta
          </Button>
        </div>
      </div>

      {questions.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma pergunta de triagem configurada. Clique em "Sugeridas" para adicionar as mais comuns.</p>
      )}

      {questions.map((q, idx) => (
        <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1 pt-1">
              <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(idx, 1)} disabled={idx === questions.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Texto da pergunta..."
                value={q.question}
                onChange={(e) => update(idx, { question: e.target.value })}
              />
              <div className="flex items-center gap-3">
                <Select value={q.type} onValueChange={(v) => update(idx, { type: v as any, options: v === "choice" ? q.options : [] })}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto livre</SelectItem>
                    <SelectItem value="choice">Múltipla escolha</SelectItem>
                    <SelectItem value="yes_no">Sim / Não</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <Switch checked={q.required} onCheckedChange={(v) => update(idx, { required: v })} />
                  <Label className="text-xs text-muted-foreground">Obrigatória</Label>
                </div>
              </div>
              {q.type === "choice" && (
                <div className="space-y-1">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <span className="text-xs text-foreground">{opt}</span>
                      <button type="button" onClick={() => removeOption(idx, oIdx)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nova opção..."
                      className="h-7 text-xs"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(idx); } }}
                    />
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => addOption(idx)}>
                      +
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <button type="button" onClick={() => remove(idx)} className="text-muted-foreground hover:text-destructive pt-1">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
