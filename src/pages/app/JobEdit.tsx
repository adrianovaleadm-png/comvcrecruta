import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, RefreshCw, CalendarIcon, X, Save } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
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
  experiencia: 20, habilidades_tecnicas: 20, localizacao: 15, senioridade: 15, soft_skills: 15, triagem: 15,
};

export default function JobEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const lastCallRef = useRef(0);
  const [screeningQuestions, setScreeningQuestions] = useState<ScreeningQuestion[]>([]);
  const [scoreWeights, setScoreWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [loaded, setLoaded] = useState(false);

  const form = useForm<JobFormValues>({
    defaultValues: { title: "", description: "", location: "", type: "CLT", status: "open", seniority: "", work_model: "", department: "", salary_min: "", salary_max: "", headcount: "1" },
  });

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: existingQuestions } = useQuery({
    queryKey: ["screening-questions", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("screening_questions").select("*").eq("job_id", id!).order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Populate form when data loads
  useEffect(() => {
    if (job && !loaded) {
      const j = job as any;
      form.reset({
        title: j.title || "", description: j.description || "", location: j.location || "",
        type: j.type || "CLT", status: j.status || "open", seniority: j.seniority || "",
        work_model: j.work_model || "", department: j.department || "",
        salary_min: j.salary_min?.toString() || "", salary_max: j.salary_max?.toString() || "",
        headcount: j.headcount?.toString() || "1",
      });
      setScoreWeights(j.score_weights || DEFAULT_WEIGHTS);
      setRequiredSkills(j.required_skills || []);
      setDeadline(j.deadline ? new Date(j.deadline) : undefined);
      setLoaded(true);
    }
  }, [job, loaded, form]);

  useEffect(() => {
    if (existingQuestions && loaded) {
      setScreeningQuestions(existingQuestions.map((q: any) => ({
        question: q.question, type: q.type, options: q.options || [], required: q.required,
      })));
    }
  }, [existingQuestions, loaded]);

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = skillInput.trim();
      if (val && !requiredSkills.includes(val)) setRequiredSkills((p) => [...p, val]);
      setSkillInput("");
    }
  };

  const updateJob = useMutation({
    mutationFn: async (values: JobFormValues) => {
      const { error } = await supabase.from("jobs").update({
        title: values.title, description: values.description || null, location: values.location || null,
        type: values.type || null, status: values.status, score_weights: scoreWeights as any,
        seniority: values.seniority || null, work_model: values.work_model || null,
        department: values.department || null,
        salary_min: values.salary_min ? parseInt(values.salary_min) : null,
        salary_max: values.salary_max ? parseInt(values.salary_max) : null,
        headcount: values.headcount ? parseInt(values.headcount) : 1,
        deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
        required_skills: requiredSkills.length > 0 ? requiredSkills : null,
      } as any).eq("id", id!);
      if (error) throw error;

      // Delete + reinsert screening questions
      await supabase.from("screening_questions").delete().eq("job_id", id!);
      const rows = screeningQuestions.filter((q) => q.question.trim()).map((q, idx) => ({
        job_id: id!, question: q.question.trim(), type: q.type,
        options: q.type === "choice" ? q.options : null, required: q.required, order_index: idx,
      }));
      if (rows.length > 0) await supabase.from("screening_questions").insert(rows);
    },
    onSuccess: () => {
      toast.success("Vaga atualizada!");
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      queryClient.invalidateQueries({ queryKey: ["screening-questions", id] });
      navigate(`/app/vagas/${id}`);
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const generateDescription = useCallback(async (improve: boolean) => {
    const now = Date.now();
    if (now - lastCallRef.current < 3000) { toast.info("Aguarde..."); return; }
    lastCallRef.current = now;
    const title = form.getValues("title");
    if (!title.trim()) { toast.error("Preencha o título."); return; }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-description", {
        body: { title, location: form.getValues("location"), type: form.getValues("type"), seniority: form.getValues("seniority"), work_model: form.getValues("work_model"), required_skills: requiredSkills, existingDescription: improve ? form.getValues("description") : undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      form.setValue("description", data.description, { shouldDirty: true });
      toast.success(improve ? "Descrição melhorada!" : "Descrição gerada!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar descrição.");
    } finally { setIsGenerating(false); }
  }, [form, requiredSkills]);

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Carregando...</div>;
  if (!job) return <div className="py-12 text-center text-muted-foreground">Vaga não encontrada.</div>;

  const descriptionValue = form.watch("description");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/app/vagas/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Editar Vaga</h1>
          <p className="text-muted-foreground">Atualize os dados da vaga.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => updateJob.mutate(v))} className="space-y-6">
          <FormField control={form.control} name="title" rules={{ required: "Título é obrigatório" }} render={({ field }) => (
            <FormItem><FormLabel>Título *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Descrição</FormLabel>
                <div className="flex gap-2">
                  {descriptionValue?.trim() && (
                    <Button type="button" variant="outline" size="sm" disabled={isGenerating} onClick={() => generateDescription(true)} className="h-7 gap-1 text-xs">
                      <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} /> Melhorar
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" disabled={isGenerating} onClick={() => generateDescription(false)} className="h-7 gap-1 text-xs">
                    <Sparkles className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} /> Gerar com IA
                  </Button>
                </div>
              </div>
              <FormControl><Textarea rows={10} {...field} /></FormControl><FormMessage />
            </FormItem>
          )} />

          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">Detalhes</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem><FormLabel>Localização</FormLabel><FormControl><Input placeholder="Ex: São Paulo" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="CLT">CLT</SelectItem><SelectItem value="PJ">PJ</SelectItem><SelectItem value="Intern">Estágio</SelectItem><SelectItem value="Contract">Contrato</SelectItem></SelectContent>
                  </Select></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="seniority" render={({ field }) => (
                <FormItem><FormLabel>Senioridade</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="junior">Júnior</SelectItem><SelectItem value="pleno">Pleno</SelectItem><SelectItem value="senior">Sênior</SelectItem><SelectItem value="specialist">Especialista</SelectItem><SelectItem value="lead">Liderança</SelectItem></SelectContent>
                  </Select></FormItem>
              )} />
              <FormField control={form.control} name="work_model" render={({ field }) => (
                <FormItem><FormLabel>Modalidade</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="hibrido">Híbrido</SelectItem><SelectItem value="remoto">Remoto</SelectItem></SelectContent>
                  </Select></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem><FormLabel>Departamento</FormLabel><FormControl><Input placeholder="Ex: Engenharia" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="headcount" render={({ field }) => (
                <FormItem><FormLabel>Qtd. de vagas</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="salary_min" render={({ field }) => (
                <FormItem><FormLabel>Salário mín. (R$)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="salary_max" render={({ field }) => (
                <FormItem><FormLabel>Salário máx. (R$)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl></FormItem>
              )} />
            </div>
            <div>
              <label className="text-sm font-medium leading-none">Data limite</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className={cn("mt-1.5 w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem><FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="open">Aberta</SelectItem><SelectItem value="draft">Rascunho</SelectItem><SelectItem value="closed">Fechada</SelectItem></SelectContent>
                </Select></FormItem>
            )} />
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Habilidades Requeridas</h3>
            <div className="flex flex-wrap gap-2">
              {requiredSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                  {skill}
                  <button type="button" onClick={() => setRequiredSkills((p) => p.filter((s) => s !== skill))} className="ml-1 rounded-full hover:bg-muted p-0.5"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <Input placeholder="Digite e pressione Enter" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={handleAddSkill} />
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <ScreeningQuestionsBuilder questions={screeningQuestions} onChange={setScreeningQuestions} jobTitle={form.watch("title")} jobDescription={form.watch("description")} />
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <ScoreWeightsConfig weights={scoreWeights} onChange={setScoreWeights} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={updateJob.isPending} className="gap-2">
              <Save className="h-4 w-4" /> {updateJob.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to={`/app/vagas/${id}`}>Cancelar</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
