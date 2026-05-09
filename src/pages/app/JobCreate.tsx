import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, RefreshCw, CalendarIcon, X, BookmarkPlus, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ScreeningQuestionsBuilder, { type ScreeningQuestion } from "@/components/jobs/ScreeningQuestionsBuilder";
import ScoreWeightsConfig, { type ScoreWeights } from "@/components/jobs/ScoreWeightsConfig";

interface JobFormValues {
  title: string;
  description: string;
  location: string;
  type: string;
  status: string;
  seniority: string;
  work_model: string;
  department: string;
  salary_min: string;
  salary_max: string;
  headcount: string;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  experiencia: 20,
  habilidades_tecnicas: 20,
  localizacao: 15,
  senioridade: 15,
  soft_skills: 15,
  triagem: 15,
};

export default function JobCreate() {
  const navigate = useNavigate();
  const companyId = useCurrentCompanyId();
  const [isGenerating, setIsGenerating] = useState(false);
  const lastCallRef = useRef(0);
  const [screeningQuestions, setScreeningQuestions] = useState<ScreeningQuestion[]>([]);
  const [scoreWeights, setScoreWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ["job-templates", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from("job_templates").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const loadTemplate = (template: any) => {
    form.reset({
      title: template.title || "", description: template.description || "",
      location: "", type: "CLT", status: "open",
      seniority: template.seniority || "", work_model: template.work_model || "",
      department: template.department || "", salary_min: "", salary_max: "", headcount: "1",
    });
    setScreeningQuestions(template.screening_questions || []);
    setScoreWeights(template.score_weights || DEFAULT_WEIGHTS);
    setRequiredSkills(template.required_skills || []);
    toast.success("Template carregado!");
  };

  const saveAsTemplate = async () => {
    const values = form.getValues();
    if (!values.title.trim()) { toast.error("Preencha o título."); return; }
    setSavingTemplate(true);
    try {
      const { error } = await supabase.from("job_templates").insert({
        title: values.title, description: values.description || null,
        seniority: values.seniority || null, work_model: values.work_model || null,
        department: values.department || null,
        required_skills: requiredSkills.length > 0 ? requiredSkills : null,
        screening_questions: screeningQuestions as any, score_weights: scoreWeights as any,
      } as any);
      if (error) throw error;
      toast.success("Template salvo!");
    } catch (err: any) { toast.error(err.message || "Erro ao salvar template."); }
    finally { setSavingTemplate(false); }
  };

  const form = useForm<JobFormValues>({
    defaultValues: {
      title: "",
      description: "",
      location: "",
      type: "CLT",
      status: "open",
      seniority: "",
      work_model: "",
      department: "",
      salary_min: "",
      salary_max: "",
      headcount: "1",
    },
  });

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = skillInput.trim();
      if (val && !requiredSkills.includes(val)) {
        setRequiredSkills((prev) => [...prev, val]);
      }
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setRequiredSkills((prev) => prev.filter((s) => s !== skill));
  };

  const createJob = useMutation({
    mutationFn: async (values: JobFormValues) => {
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          title: values.title,
          description: values.description || null,
          location: values.location || null,
          type: values.type || null,
          status: values.status,
          score_weights: scoreWeights as any,
          seniority: values.seniority || null,
          work_model: values.work_model || null,
          department: values.department || null,
          salary_min: values.salary_min ? parseInt(values.salary_min) : null,
          salary_max: values.salary_max ? parseInt(values.salary_max) : null,
          headcount: values.headcount ? parseInt(values.headcount) : 1,
          deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
          required_skills: requiredSkills.length > 0 ? requiredSkills : null,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Save screening questions
      if (screeningQuestions.length > 0) {
        const rows = screeningQuestions
          .filter((q) => q.question.trim())
          .map((q, idx) => ({
            job_id: data.id,
            question: q.question.trim(),
            type: q.type,
            options: q.type === "choice" ? q.options : null,
            required: q.required,
            order_index: idx,
          }));
        if (rows.length > 0) {
          const { error: sqErr } = await supabase.from("screening_questions").insert(rows);
          if (sqErr) console.error("Error saving screening questions:", sqErr);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success("Vaga criada com sucesso!");
      navigate(`/app/vagas/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Erro ao criar vaga: ${error.message}`);
    },
  });

  const generateDescription = useCallback(async (improve: boolean) => {
    const now = Date.now();
    if (now - lastCallRef.current < 3000) {
      toast.info("Aguarde alguns segundos antes de tentar novamente.");
      return;
    }
    lastCallRef.current = now;

    const title = form.getValues("title");
    if (!title.trim()) {
      toast.error("Preencha o título da vaga antes de gerar a descrição.");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-description", {
        body: {
          title,
          location: form.getValues("location"),
          type: form.getValues("type"),
          status: form.getValues("status"),
          seniority: form.getValues("seniority"),
          work_model: form.getValues("work_model"),
          required_skills: requiredSkills,
          existingDescription: improve ? form.getValues("description") : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      form.setValue("description", data.description, { shouldDirty: true });
      toast.success(improve ? "Descrição melhorada!" : "Descrição gerada!");
    } catch (e: any) {
      console.error("AI generation error:", e);
      toast.error(e?.message || "Erro ao gerar descrição. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  }, [form, requiredSkills]);

  const descriptionValue = form.watch("description");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/vagas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Nova Vaga</h1>
          <p className="text-muted-foreground">Preencha os dados da vaga.</p>
        </div>
        <div className="flex gap-2">
          {templates && templates.length > 0 && (
            <Select onValueChange={(val) => { const t = templates.find((t: any) => t.id === val); if (t) loadTemplate(t); }}>
              <SelectTrigger className="w-48 h-9">
                <BookOpen className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Usar template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button type="button" variant="outline" size="sm" onClick={saveAsTemplate} disabled={savingTemplate} className="gap-1">
            <BookmarkPlus className="h-4 w-4" /> {savingTemplate ? "..." : "Salvar Template"}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => createJob.mutate(v))} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            rules={{ required: "Título é obrigatório" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Engenheiro de Software Sênior" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Descrição</FormLabel>
                  <div className="flex gap-2">
                    {descriptionValue?.trim() && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isGenerating}
                        onClick={() => generateDescription(true)}
                        className="h-7 gap-1 text-xs"
                      >
                        <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
                        {isGenerating ? "Melhorando…" : "Melhorar texto"}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isGenerating}
                      onClick={() => generateDescription(false)}
                      className="h-7 gap-1 text-xs"
                    >
                      <Sparkles className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
                      {isGenerating ? "Gerando…" : "Gerar com IA"}
                    </Button>
                  </div>
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Descreva a vaga, requisitos, responsabilidades..."
                    rows={10}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Detalhes */}
          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">Detalhes</h3>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: São Paulo, SP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CLT">CLT</SelectItem>
                        <SelectItem value="PJ">PJ</SelectItem>
                        <SelectItem value="Intern">Estágio</SelectItem>
                        <SelectItem value="Contract">Contrato</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="seniority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="junior">Júnior</SelectItem>
                        <SelectItem value="pleno">Pleno</SelectItem>
                        <SelectItem value="senior">Sênior</SelectItem>
                        <SelectItem value="specialist">Especialista</SelectItem>
                        <SelectItem value="lead">Liderança</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="work_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="presencial">Presencial</SelectItem>
                        <SelectItem value="hibrido">Híbrido</SelectItem>
                        <SelectItem value="remoto">Remoto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Engenharia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="headcount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qtd. de vagas</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="salary_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salário mín. (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="Ex: 5000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salary_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salário máx. (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="Ex: 12000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="text-sm font-medium leading-none">Data limite</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "mt-1.5 w-full justify-start text-left font-normal",
                      !deadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    disabled={(d) => d < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="open">Aberta</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="closed">Fechada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Required Skills */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Habilidades Requeridas</h3>
            <div className="flex flex-wrap gap-2">
              {requiredSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)} className="ml-1 rounded-full hover:bg-muted p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Digite e pressione Enter para adicionar"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleAddSkill}
            />
          </div>

          {/* Screening Questions */}
          <div className="rounded-lg border border-border bg-card p-4">
            <ScreeningQuestionsBuilder questions={screeningQuestions} onChange={setScreeningQuestions} jobTitle={form.watch("title")} jobDescription={form.watch("description")} />
          </div>

          {/* Score Weights */}
          <div className="rounded-lg border border-border bg-card p-4">
            <ScoreWeightsConfig weights={scoreWeights} onChange={setScoreWeights} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createJob.isPending || isGenerating}>
              {createJob.isPending ? "Criando..." : "Criar Vaga"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/app/vagas">Cancelar</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
