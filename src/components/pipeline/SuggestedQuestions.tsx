import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy, Check, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface SuggestedQuestion {
  question: string;
  rationale?: string;
}

interface Props {
  candidateId: string;
  jobId: string;
  stageName: string;
}

export default function SuggestedQuestions({ candidateId, jobId, stageName }: Props) {
  const [questions, setQuestions] = useState<SuggestedQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-interview-questions", {
        body: {
          candidate_id: candidateId,
          job_id: jobId,
          stage_name: stageName,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!Array.isArray(data?.questions)) throw new Error("Resposta inválida da IA.");
      setQuestions(data.questions);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar perguntas.");
    } finally {
      setLoading(false);
    }
  };

  const copyOne = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const copyAll = () => {
    if (!questions || questions.length === 0) return;
    const text = questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
    toast.success("Todas as perguntas copiadas.");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
          <p>
            Gere perguntas personalizadas para a etapa{" "}
            <strong className="text-foreground">"{stageName}"</strong> com base no perfil deste
            candidato, vaga e respostas de triagem.
          </p>
        </div>
      </div>

      {!questions && (
        <Button
          onClick={generate}
          disabled={loading}
          className="w-full gap-2"
          variant="default"
        >
          <Sparkles className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Gerando com IA..." : `Sugerir perguntas para "${stageName}"`}
        </Button>
      )}

      {questions && questions.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {questions.length} pergunta{questions.length === 1 ? "" : "s"} sugerida{questions.length === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={copyAll}>
                {copiedAll ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedAll ? "Copiado" : "Copiar todas"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={generate}
                disabled={loading}
              >
                <Sparkles className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Regenerar
              </Button>
            </div>
          </div>

          <ol className="space-y-2">
            {questions.map((q, idx) => (
              <li
                key={idx}
                className="rounded-lg border border-border bg-card p-3 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 text-sm text-foreground">
                    <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                    {q.question}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={() => copyOne(idx, q.question)}
                    title="Copiar pergunta"
                  >
                    {copiedIdx === idx ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {q.rationale && (
                  <p className="text-xs text-muted-foreground italic">
                    💡 {q.rationale}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </>
      )}

      {questions && questions.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          A IA não retornou perguntas. Tente novamente.
        </div>
      )}
    </div>
  );
}
