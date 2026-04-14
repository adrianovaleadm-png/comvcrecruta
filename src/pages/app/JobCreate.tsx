import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface JobFormValues {
  title: string;
  description: string;
  location: string;
  type: string;
  status: string;
}

export default function JobCreate() {
  const navigate = useNavigate();

  const form = useForm<JobFormValues>({
    defaultValues: {
      title: "",
      description: "",
      location: "",
      type: "CLT",
      status: "open",
    },
  });

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
        })
        .select()
        .single();
      if (error) throw error;
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/vagas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nova Vaga</h1>
          <p className="text-muted-foreground">Preencha os dados da vaga.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => createJob.mutate(v))} className="space-y-4">
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
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea placeholder="Descreva a vaga, requisitos, responsabilidades..." rows={5} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createJob.isPending}>
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
