import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Search, UserPlus, Users, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Stage {
  id: string;
  name: string;
  order_index: number;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface ScreeningQuestion {
  id: string;
  question: string;
  type: string;
  options: string[] | null;
  required: boolean;
  order_index: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  jobId: string;
  stages: Stage[];
}

export default function AddCandidateModal({ open, onClose, jobId, stages }: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"existing" | "new">("new");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // New candidate form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Existing candidate search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  // Screening answers
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const firstStageId = stages.sort((a, b) => a.order_index - b.order_index)[0]?.id;

  // Fetch screening questions for job
  const { data: screeningQuestions } = useQuery({
    queryKey: ["screening-questions", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screening_questions")
        .select("*")
        .eq("job_id", jobId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as ScreeningQuestion[];
    },
    enabled: open,
  });

  const hasScreening = screeningQuestions && screeningQuestions.length > 0;

  useEffect(() => {
    if (!open) {
      setName(""); setEmail(""); setPhone("");
      setSearchQuery(""); setSearchResults([]); setSelectedCandidate(null);
      setTab("new"); setStep(1); setAnswers({});
    }
  }, [open]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    searchDebounce.current = setTimeout(async () => {
      const { data } = await supabase
        .from("candidates")
        .select("*")
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);
      setSearchResults(data || []);
    }, 300);
  }, [searchQuery]);

  const validateStep1 = (): boolean => {
    if (tab === "new") {
      if (!name.trim() || !email.trim()) { toast.error("Nome e email são obrigatórios."); return false; }
    } else {
      if (!selectedCandidate) { toast.error("Selecione um candidato."); return false; }
    }
    if (!firstStageId) { toast.error("Nenhuma etapa encontrada."); return false; }
    return true;
  };

  const validateScreening = (): boolean => {
    if (!screeningQuestions) return true;
    for (const q of screeningQuestions) {
      if (q.required && !answers[q.id]?.trim()) {
        toast.error(`Responda: "${q.question}"`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep1()) return;
    if (hasScreening) {
      setStep(2);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (step === 2 && !validateScreening()) return;
    setSaving(true);
    try {
      let candidateId: string;

      if (tab === "new") {
        const { data: existing } = await supabase
          .from("candidates").select("id").eq("email", email.trim()).maybeSingle();
        if (existing) {
          candidateId = existing.id;
        } else {
          const { data: newC, error } = await supabase
            .from("candidates")
            .insert({ name: name.trim(), email: email.trim(), phone: phone.trim() || null })
            .select("id").single();
          if (error) throw error;
          candidateId = newC.id;
        }
      } else {
        candidateId = selectedCandidate!.id;
      }

      const { data: app, error: appError } = await supabase.from("applications").insert({
        job_id: jobId, candidate_id: candidateId, stage_id: firstStageId, status: "active",
      }).select("id").single();
      if (appError) throw appError;

      // Save screening answers
      if (hasScreening && Object.keys(answers).length > 0) {
        const rows = Object.entries(answers)
          .filter(([_, v]) => v.trim())
          .map(([qId, answer]) => ({ application_id: app.id, question_id: qId, answer }));
        if (rows.length > 0) {
          const { error: saErr } = await supabase.from("screening_answers").insert(rows);
          if (saErr) console.error("Error saving screening answers:", saErr);
        }
      }

      toast.success("Candidato adicionado ao pipeline!");
      queryClient.invalidateQueries({ queryKey: ["pipeline-applications", jobId] });

      // Fire-and-forget: auto-score candidate
      toast.info("Calculando Fit Score...");
      supabase.functions.invoke("score-candidate-job", {
        body: { candidate_id: candidateId, job_id: jobId },
      }).then(({ error: scoreErr }) => {
        if (scoreErr) {
          console.error("Auto-score error:", scoreErr);
        } else {
          queryClient.invalidateQueries({ queryKey: ["pipeline-scores", jobId] });
          queryClient.invalidateQueries({ queryKey: ["job-ranking", jobId] });
          toast.success("Fit Score calculado!");
        }
      });

      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar candidato.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {step === 1 ? "Adicionar Candidato" : "Triagem"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        {hasScreening && (
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className={step === 1 ? "font-bold text-primary" : ""}>1. Candidato</span>
            <ArrowRight className="h-3 w-3" />
            <span className={step === 2 ? "font-bold text-primary" : ""}>2. Triagem</span>
          </div>
        )}

        {step === 1 && (
          <>
            {/* Tabs */}
            <div className="mb-4 flex rounded-lg border border-border">
              <button
                className={`flex flex-1 items-center justify-center gap-2 rounded-l-lg px-4 py-2 text-sm font-medium transition-colors ${
                  tab === "new" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("new")}
              >
                <UserPlus className="h-4 w-4" /> Novo candidato
              </button>
              <button
                className={`flex flex-1 items-center justify-center gap-2 rounded-r-lg px-4 py-2 text-sm font-medium transition-colors ${
                  tab === "existing" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("existing")}
              >
                <Users className="h-4 w-4" /> Existente
              </button>
            </div>

            {tab === "new" && (
              <div className="space-y-3">
                <div><Label htmlFor="name">Nome *</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" /></div>
                <div><Label htmlFor="email">Email *</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" /></div>
                <div><Label htmlFor="phone">Telefone</Label><Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" /></div>
              </div>
            )}

            {tab === "existing" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar por nome ou email..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {searchResults.length === 0 && searchQuery && (
                    <p className="py-4 text-center text-sm text-muted-foreground">Nenhum candidato encontrado.</p>
                  )}
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCandidate(c)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                        selectedCandidate?.id === c.id
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted border border-transparent"
                      }`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button className="mt-4 w-full gap-2" onClick={handleNext} disabled={saving}>
              {hasScreening ? <>Próximo <ArrowRight className="h-4 w-4" /></> : (saving ? "Salvando..." : "Adicionar ao pipeline")}
            </Button>
          </>
        )}

        {step === 2 && screeningQuestions && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Responda as perguntas de triagem para esta vaga.</p>

            {screeningQuestions.map((q) => (
              <div key={q.id} className="space-y-1">
                <Label className="text-sm">
                  {q.question} {q.required && <span className="text-destructive">*</span>}
                </Label>
                {q.type === "text" && (
                  <Textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="Sua resposta..."
                    rows={3}
                  />
                )}
                {q.type === "yes_no" && (
                  <div className="flex gap-3">
                    {["Sim", "Não"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                        className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                          answers[q.id] === opt
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === "choice" && q.options && (
                  <div className="flex flex-col gap-1">
                    {(q.options as string[]).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          answers[q.id] === opt
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
                {saving ? "Salvando..." : "Adicionar ao pipeline"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
