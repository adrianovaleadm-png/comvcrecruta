import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { ArrowLeft, Save, Plus, X, Upload, FileText, ExternalLink, Briefcase, ClipboardCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import AssignToJobModal from "@/components/talents/AssignToJobModal";
import FitScoreBadge from "@/components/pipeline/FitScoreBadge";

export default function TalentProfile() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "", linkedin_url: "", summary: "" });
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [parsing, setParsing] = useState(false);

  const { data: candidate, isLoading } = useQuery({
    queryKey: ["talent", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidates").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: tags } = useQuery({
    queryKey: ["talent-tags", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_tags")
        .select("tag_id, tags(id, name)")
        .eq("candidate_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: files } = useQuery({
    queryKey: ["talent-files", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_files")
        .select("*")
        .eq("candidate_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: applications } = useQuery({
    queryKey: ["talent-applications", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs(id, title, status), stages(name)")
        .eq("candidate_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: candidateScores } = useQuery({
    queryKey: ["candidate-scores", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_scores")
        .select("*")
        .eq("candidate_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch screening answers for all applications
  const { data: screeningAnswers } = useQuery({
    queryKey: ["talent-screening-answers", id],
    queryFn: async () => {
      const appIds = applications?.map((a: any) => a.id) || [];
      if (appIds.length === 0) return [];
      const { data, error } = await supabase
        .from("screening_answers")
        .select("application_id, answer, screening_questions(question)")
        .in("application_id", appIds);
      if (error) throw error;
      return data;
    },
    enabled: !!applications && applications.length > 0,
  });

  const getAnswersForApp = (appId: string) =>
    screeningAnswers?.filter((a: any) => a.application_id === appId) || [];

  const getScoreForJob = (jobId: string) => candidateScores?.find((s: any) => s.job_id === jobId);

  const startEdit = () => {
    if (!candidate) return;
    setForm({
      name: candidate.name || "",
      email: candidate.email || "",
      phone: candidate.phone || "",
      city: (candidate as any).city || "",
      linkedin_url: (candidate as any).linkedin_url || "",
      summary: (candidate as any).summary || "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("candidates").update({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        summary: form.summary.trim() || null,
      }).eq("id", id!);
      if (error) throw error;
      toast.success("Candidato atualizado!");
      queryClient.invalidateQueries({ queryKey: ["talent", id] });
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    setAddingTag(true);
    try {
      // Upsert tag
      let tagId: string;
      const { data: existing } = await supabase.from("tags").select("id").eq("name", newTag.trim()).maybeSingle();
      if (existing) {
        tagId = existing.id;
      } else {
        const { data: created, error } = await supabase.from("tags").insert({ name: newTag.trim() }).select("id").single();
        if (error) throw error;
        tagId = created.id;
      }
      // Link
      const { error } = await supabase.from("candidate_tags").insert({ candidate_id: id!, tag_id: tagId });
      if (error && error.code !== "23505") throw error;
      toast.success("Tag adicionada!");
      setNewTag("");
      queryClient.invalidateQueries({ queryKey: ["talent-tags", id] });
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar tag.");
    } finally {
      setAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await supabase.from("candidate_tags").delete().eq("candidate_id", id!).eq("tag_id", tagId);
      queryClient.invalidateQueries({ queryKey: ["talent-tags", id] });
      toast.success("Tag removida.");
    } catch {
      toast.error("Erro ao remover tag.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("candidate-files").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("candidate-files").getPublicUrl(path);

      const { error } = await supabase.from("candidate_files").insert({
        candidate_id: id!,
        type: "cv",
        url: urlData.publicUrl,
        name: file.name,
      });
      if (error) throw error;
      toast.success("Arquivo enviado!");
      queryClient.invalidateQueries({ queryKey: ["talent-files", id] });
    } catch (err: any) {
      toast.error(err.message || "Erro no upload.");
    } finally {
      setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleParseResume = async (fileUrl: string) => {
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-resume", {
        body: { file_url: fileUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Auto-fill form fields
      if (data.name || data.email || data.city || data.summary) {
        setForm({
          name: data.name || form.name,
          email: data.email || form.email,
          phone: data.phone || form.phone,
          city: data.city || form.city,
          linkedin_url: data.linkedin_url || form.linkedin_url,
          summary: data.summary || form.summary,
        });
        setEditing(true);
        toast.success("Dados extraídos do currículo!");

        // Auto-add skills as tags
        if (data.skills?.length > 0) {
          for (const skill of data.skills.slice(0, 10)) {
            try {
              const { data: existing } = await supabase.from("tags").select("id").eq("name", skill).maybeSingle();
              const tagId = existing?.id || (await supabase.from("tags").insert({ name: skill }).select("id").single()).data?.id;
              if (tagId) await supabase.from("candidate_tags").insert({ candidate_id: id!, tag_id: tagId }).then(() => {});
            } catch {}
          }
          queryClient.invalidateQueries({ queryKey: ["talent-tags", id] });
        }
      } else {
        toast.info("Não foi possível extrair dados deste arquivo.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao analisar currículo.");
    } finally { setParsing(false); }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!candidate) {
    return <div className="py-12 text-center text-muted-foreground">Candidato não encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/talentos" className="hover:text-foreground transition-colors">Banco de Talentos</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{candidate.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/talentos"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{candidate.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAssignModalOpen(true)} className="gap-2">
            <Briefcase className="h-4 w-4" /> Indicar para vaga
          </Button>
          {!editing ? (
            <Button onClick={startEdit}>Editar</Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Dados */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Dados do Candidato</h2>
            {editing ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>LinkedIn</Label><Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} /></div>
                <div className="sm:col-span-2">
                  <Label>Resumo</Label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                    value={form.summary}
                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{candidate.email}</span></div>
                <div><span className="text-muted-foreground">Telefone:</span> <span className="text-foreground">{candidate.phone || "—"}</span></div>
                <div><span className="text-muted-foreground">Cidade:</span> <span className="text-foreground">{(candidate as any).city || "—"}</span></div>
                <div><span className="text-muted-foreground">LinkedIn:</span> {(candidate as any).linkedin_url ? <a href={(candidate as any).linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Abrir perfil</a> : <span className="text-foreground">—</span>}</div>
                {(candidate as any).summary && (
                  <div className="sm:col-span-2"><span className="text-muted-foreground">Resumo:</span> <p className="mt-1 text-foreground whitespace-pre-wrap">{(candidate as any).summary}</p></div>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {tags?.map((ct: any) => (
                <Badge key={ct.tag_id} variant="secondary" className="gap-1">
                  {ct.tags?.name}
                  <button onClick={() => handleRemoveTag(ct.tag_id)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {(!tags || tags.length === 0) && <span className="text-xs text-muted-foreground">Nenhuma tag.</span>}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nova tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="max-w-xs"
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              />
              <Button size="sm" onClick={handleAddTag} disabled={addingTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Candidaturas */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Candidaturas</h2>
            {(!applications || applications.length === 0) ? (
              <p className="text-sm text-muted-foreground">Nenhuma candidatura registrada.</p>
            ) : (
              <div className="space-y-2">
                {applications.map((app: any) => (
                  <div key={app.id} className="rounded-lg border border-border px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{app.jobs?.title || "Vaga"}</p>
                        <p className="text-xs text-muted-foreground">
                          Etapa: {app.stages?.name || "—"} · Status: {app.status === "active" ? "Ativo" : app.status === "hired" ? "Contratado" : "Reprovado"}
                          {" · "}{new Date(app.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <FitScoreBadge score={getScoreForJob(app.job_id)?.overall_score} candidateId={id!} jobId={app.job_id} />
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/app/vagas/${app.job_id}/pipeline`}>Pipeline</Link>
                        </Button>
                      </div>
                    </div>
                    {getScoreForJob(app.job_id)?.criteria_scores && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(getScoreForJob(app.job_id)!.criteria_scores as Record<string, { score: number; nota: string }>).map(([key, val]) => (
                          <span key={key} className="text-xs text-muted-foreground" title={val.nota}>
                            {key}: <span className="font-medium text-foreground">{val.score}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Screening Answers */}
                    {getAnswersForApp(app.id).length > 0 && (
                      <div className="mt-2 rounded-lg bg-muted/30 p-2 space-y-1">
                        <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <ClipboardCheck className="h-3 w-3" /> Respostas de triagem
                        </p>
                        {getAnswersForApp(app.id).map((a: any, idx: number) => (
                          <div key={idx} className="text-xs">
                            <span className="text-muted-foreground">{a.screening_questions?.question}:</span>{" "}
                            <span className="text-foreground font-medium">{a.answer}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Files */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Arquivos</h2>
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg" onChange={handleFileUpload} />
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4" /> {uploading ? "Enviando..." : "Upload de currículo"}
            </Button>
            <div className="space-y-2">
              {files?.map((f: any) => (
                <div key={f.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center gap-2 text-foreground hover:text-primary transition-colors">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{f.name || "Arquivo"}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" disabled={parsing} onClick={() => handleParseResume(f.url)}>
                    <Sparkles className={`h-3 w-3 ${parsing ? "animate-spin" : ""}`} /> {parsing ? "..." : "Extrair"}
                  </Button>
                </div>
              ))}
              {(!files || files.length === 0) && <p className="text-xs text-muted-foreground">Nenhum arquivo enviado.</p>}
            </div>
          </div>
        </div>
      </div>

      <AssignToJobModal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} candidateId={id!} />
    </div>
  );
}
