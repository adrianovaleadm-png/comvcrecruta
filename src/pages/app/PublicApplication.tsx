import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Briefcase, MapPin, GraduationCap, Monitor, CheckCircle, Building2, Heart, Gift, Linkedin, Instagram, Globe } from "lucide-react";

const seniorityLabels: Record<string, string> = { junior: "Júnior", pleno: "Pleno", senior: "Sênior", specialist: "Especialista", lead: "Liderança" };
const workModelLabels: Record<string, string> = { presencial: "Presencial", hibrido: "Híbrido", remoto: "Remoto" };

// Versao da Politica de Privacidade vigente.
// Bump esta string sempre que mudar o texto em /politica-privacidade.
const CONSENT_VERSION = "v1-2026-05-14";

export default function PublicApplication() {
  const { id } = useParams<{ id: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [consentAccepted, setConsentAccepted] = useState(false);

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["public-job", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id!).eq("status", "open").single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: questions } = useQuery({
    queryKey: ["public-screening", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("screening_questions").select("*").eq("job_id", id!).order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: stages } = useQuery({
    queryKey: ["public-stages", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("stages").select("*").eq("job_id", id!).order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: company } = useQuery({
    queryKey: ["public-company"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) { toast.error("Nome e email são obrigatórios."); return; }
    if (!id || !job) { toast.error("Vaga não encontrada."); return; }
    if (!consentAccepted) {
      toast.error("Para enviar a candidatura, aceite a Política de Privacidade.");
      return;
    }
    if (questions) {
      for (const q of questions) {
        if ((q as any).required && !answers[q.id]?.trim()) {
          toast.error(`Responda: "${q.question}"`); return;
        }
      }
    }

    setSaving(true);
    try {
      // Re-busca company_id no momento do submit (evita cache stale do React Query).
      const { data: jobFresh, error: jobFreshErr } = await supabase
        .from("jobs")
        .select("company_id")
        .eq("id", id)
        .single();
      if (jobFreshErr || !jobFresh?.company_id) {
        console.error("Vaga sem company_id:", { jobFreshErr, jobFresh, jobInMemory: job });
        toast.error("Esta vaga não está disponível para candidaturas.");
        setSaving(false);
        return;
      }
      const companyId = jobFresh.company_id;

      // Upsert candidate
      let candidateId: string;
      const { data: existing } = await supabase.from("candidates").select("id").eq("email", email.trim()).maybeSingle();
      if (existing) {
        candidateId = existing.id;
      } else {
        const { data: newC, error } = await supabase.from("candidates").insert({
          company_id: companyId,
          name: name.trim(), email: email.trim(), phone: phone.trim() || null,
          city: city.trim() || null, linkedin_url: linkedinUrl.trim() || null,
        }).select("id").single();
        if (error) throw error;
        candidateId = newC.id;
      }

      const firstStageId = stages?.sort((a, b) => a.order_index - b.order_index)[0]?.id;
      if (!firstStageId) throw new Error("Nenhuma etapa encontrada.");

      const { data: app, error: appErr } = await supabase.from("applications").insert({
        job_id: id!, candidate_id: candidateId, stage_id: firstStageId, status: "active",
        consent_accepted_at: new Date().toISOString(),
        consent_version: CONSENT_VERSION,
      } as any).select("id").single();
      if (appErr) throw appErr;

      // Save screening answers
      const rows = Object.entries(answers).filter(([_, v]) => v.trim()).map(([qId, answer]) => ({
        application_id: app.id, question_id: qId, answer,
      }));
      if (rows.length > 0) await supabase.from("screening_answers").insert(rows);

      // Auto-score (fire-and-forget)
      supabase.functions.invoke("score-candidate-job", {
        body: { candidate_id: candidateId, job_id: id },
      }).catch(console.error);

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar candidatura.");
    } finally { setSaving(false); }
  };

  if (jobLoading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!job) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Vaga não encontrada ou não está aberta.</p></div>;

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <CheckCircle className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Candidatura enviada!</h1>
          <p className="text-muted-foreground">Sua candidatura para <strong>{job.title}</strong> foi registrada com sucesso. Entraremos em contato em breve.</p>
        </div>
      </div>
    );
  }

  const jobAny = job as any;
  const co = company as any;
  const valoresList = co?.valores ? String(co.valores).split("\n").map((v: string) => v.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Job Header */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {job.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>}
            {job.type && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {job.type}</span>}
            {jobAny.seniority && <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {seniorityLabels[jobAny.seniority] || jobAny.seniority}</span>}
            {jobAny.work_model && <span className="flex items-center gap-1"><Monitor className="h-3.5 w-3.5" /> {workModelLabels[jobAny.work_model] || jobAny.work_model}</span>}
          </div>
          {jobAny.required_skills?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {jobAny.required_skills.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
            </div>
          )}
          {job.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground mt-3">{job.description}</p>}
        </div>

        {/* Sobre a Empresa */}
        {co && (co.descricao || co.missao || co.visao || valoresList.length > 0 || co.proposito || co.beneficios?.length > 0 || co.diferenciais?.length > 0) && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-3">
              {co.logo_url ? (
                <img src={co.logo_url} alt={co.nome_fantasia} className="w-12 h-12 rounded-lg object-cover border border-border" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center"><Building2 className="h-5 w-5 text-muted-foreground" /></div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-foreground">{co.nome_fantasia}</h2>
                {co.setor && <p className="text-xs text-muted-foreground">{co.setor}</p>}
              </div>
            </div>

            {co.descricao && <p className="text-sm text-muted-foreground">{co.descricao}</p>}

            {(co.proposito || co.missao || co.visao || valoresList.length > 0) && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Heart className="h-4 w-4 text-primary" /> Nossa cultura</div>
                {co.proposito && <div><p className="text-xs font-medium text-muted-foreground uppercase mb-1">Propósito</p><p className="text-sm text-foreground">{co.proposito}</p></div>}
                {co.missao && <div><p className="text-xs font-medium text-muted-foreground uppercase mb-1">Missão</p><p className="text-sm text-foreground">{co.missao}</p></div>}
                {co.visao && <div><p className="text-xs font-medium text-muted-foreground uppercase mb-1">Visão</p><p className="text-sm text-foreground">{co.visao}</p></div>}
                {valoresList.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1.5">Valores</p>
                    <div className="flex flex-wrap gap-1.5">
                      {valoresList.map((v: string) => <Badge key={v} variant="outline">{v}</Badge>)}
                    </div>
                  </div>
                )}
                {co.ambiente_trabalho && <div><p className="text-xs font-medium text-muted-foreground uppercase mb-1">Ambiente</p><p className="text-sm text-foreground">{co.ambiente_trabalho}</p></div>}
                {co.diferenciais?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1.5">Diferenciais</p>
                    <div className="flex flex-wrap gap-1.5">
                      {co.diferenciais.map((d: string) => <Badge key={d} variant="secondary">{d}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {co.beneficios?.length > 0 && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"><Gift className="h-4 w-4 text-primary" /> Benefícios</div>
                <div className="flex flex-wrap gap-1.5">
                  {co.beneficios.map((b: string) => <Badge key={b} variant="outline">{b}</Badge>)}
                </div>
              </div>
            )}

            {(co.website || co.linkedin_url || co.instagram_url) && (
              <div className="pt-2 border-t border-border flex flex-wrap gap-3 text-sm">
                {co.website && <a href={co.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Globe className="h-3.5 w-3.5" /> Website</a>}
                {co.linkedin_url && <a href={co.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</a>}
                {co.instagram_url && <a href={co.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Instagram className="h-3.5 w-3.5" /> Instagram</a>}
              </div>
            )}
          </div>
        )}

        {/* Application Form */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Candidate-se</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" /></div>
            <div><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" /></div>
            <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" /></div>
            <div><Label>Cidade</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo, SP" /></div>
            <div className="sm:col-span-2"><Label>LinkedIn</Label><Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." /></div>
          </div>
        </div>

        {/* Screening */}
        {questions && questions.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Perguntas de Triagem</h2>
            {questions.map((q: any) => (
              <div key={q.id} className="space-y-1">
                <Label className="text-sm">{q.question} {q.required && <span className="text-destructive">*</span>}</Label>
                {q.type === "text" && <Textarea value={answers[q.id] || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} rows={3} />}
                {q.type === "yes_no" && (
                  <div className="flex gap-3">
                    {["Sim", "Não"].map((opt) => (
                      <button key={opt} type="button" onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                        className={`rounded-lg border px-4 py-2 text-sm transition-colors ${answers[q.id] === opt ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === "choice" && q.options && (
                  <div className="flex flex-col gap-1">
                    {(q.options as string[]).map((opt) => (
                      <button key={opt} type="button" onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${answers[q.id] === opt ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* LGPD consent */}
        <div className="rounded-lg border border-border bg-card p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer flex-shrink-0"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              Li e aceito a{" "}
              <a
                href="/politica-privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline"
              >
                Política de Privacidade
              </a>{" "}
              e autorizo o tratamento dos meus dados pessoais para fins de recrutamento e seleção,
              nos termos da LGPD (Lei nº 13.709/2018).
            </span>
          </label>
        </div>

        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={saving || !consentAccepted}>
          {saving ? "Enviando..." : "Enviar Candidatura"}
        </Button>
      </div>
    </div>
  );
}
