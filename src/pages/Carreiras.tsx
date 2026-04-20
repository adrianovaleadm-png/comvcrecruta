import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  MapPin,
  Building2,
  Linkedin,
  Instagram,
  Globe,
  Search,
  ArrowRight,
  Heart,
  Gift,
} from "lucide-react";

const seniorityLabels: Record<string, string> = {
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
  specialist: "Especialista",
  lead: "Liderança",
};
const workModelLabels: Record<string, string> = {
  presencial: "Presencial",
  hibrido: "Híbrido",
  remoto: "Remoto",
};

export default function Carreiras() {
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [model, setModel] = useState<string>("all");
  const [sen, setSen] = useState<string>("all");

  const { data: company, isLoading: loadingCompany } = useQuery({
    queryKey: ["careers-company"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ["careers-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!jobs) return [];
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (q && !`${j.title} ${j.description ?? ""}`.toLowerCase().includes(q))
        return false;
      if (dept !== "all" && (j.department ?? "") !== dept) return false;
      if (model !== "all" && (j.work_model ?? "") !== model) return false;
      if (sen !== "all" && (j.seniority ?? "") !== sen) return false;
      return true;
    });
  }, [jobs, search, dept, model, sen]);

  const departments = useMemo(
    () =>
      Array.from(
        new Set((jobs ?? []).map((j) => j.department).filter(Boolean) as string[]),
      ),
    [jobs],
  );

  if (loadingCompany) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Página de carreiras não disponível.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            {company.logo_url && (
              <img
                src={company.logo_url}
                alt={`Logo ${company.nome_fantasia}`}
                className="h-20 w-20 rounded-lg border border-border object-cover"
              />
            )}
            <div className="flex-1">
              <Badge variant="secondary" className="mb-2">
                Trabalhe conosco
              </Badge>
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">
                {company.nome_fantasia}
              </h1>
              {company.proposito && (
                <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
                  {company.proposito}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-6 py-12">
        {/* SOBRE */}
        {(company.descricao || company.missao || company.visao || company.valores) && (
          <section className="grid gap-4 md:grid-cols-2">
            {company.missao && (
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                  <Heart className="h-4 w-4" /> Missão
                </div>
                <p className="text-sm text-foreground">{company.missao}</p>
              </div>
            )}
            {company.visao && (
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                  <Building2 className="h-4 w-4" /> Visão
                </div>
                <p className="text-sm text-foreground">{company.visao}</p>
              </div>
            )}
            {company.valores && (
              <div className="rounded-lg border border-border bg-card p-5 md:col-span-2">
                <div className="mb-2 text-sm font-semibold text-primary">Valores</div>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {company.valores}
                </p>
              </div>
            )}
            {company.ambiente_trabalho && (
              <div className="rounded-lg border border-border bg-card p-5 md:col-span-2">
                <div className="mb-2 text-sm font-semibold text-primary">
                  Ambiente de trabalho
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {company.ambiente_trabalho}
                </p>
              </div>
            )}
          </section>
        )}

        {/* BENEFÍCIOS */}
        {company.beneficios && company.beneficios.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-foreground">
              <Gift className="h-5 w-5 text-primary" /> Benefícios
            </h2>
            <div className="flex flex-wrap gap-2">
              {company.beneficios.map((b: string, i: number) => (
                <Badge key={i} variant="outline" className="px-3 py-1">
                  {b}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* VAGAS */}
        <section>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Vagas abertas
              </h2>
              <p className="text-sm text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "oportunidade" : "oportunidades"}
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="mb-6 grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar vaga..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger>
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="Modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os modelos</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="hibrido">Híbrido</SelectItem>
                <SelectItem value="remoto">Remoto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingJobs ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-foreground">Nenhuma vaga aberta no momento.</p>
              <p className="text-sm text-muted-foreground">
                Volte em breve para novas oportunidades.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((j) => (
                <Link
                  key={j.id}
                  to={`/vaga/${j.id}/candidatar`}
                  className="group flex flex-col rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground group-hover:text-primary">
                      {j.title}
                    </h3>
                    {j.seniority && (
                      <Badge variant="secondary">
                        {seniorityLabels[j.seniority] || j.seniority}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {j.department && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> {j.department}
                      </span>
                    )}
                    {j.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {j.location}
                      </span>
                    )}
                    {j.work_model && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />{" "}
                        {workModelLabels[j.work_model] || j.work_model}
                      </span>
                    )}
                  </div>
                  {(j.salary_min || j.salary_max) && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Faixa:{" "}
                      <span className="font-medium text-foreground">
                        {j.salary_min ? `R$ ${j.salary_min.toLocaleString("pt-BR")}` : "—"}
                        {" - "}
                        {j.salary_max ? `R$ ${j.salary_max.toLocaleString("pt-BR")}` : "—"}
                      </span>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-end text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Candidatar-se <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {company.nome_fantasia}. Todos os direitos reservados.
            </p>
            <div className="flex gap-3">
              {company.linkedin_url && (
                <a
                  href={company.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="rounded-md border border-border p-2 text-muted-foreground hover:text-primary"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {company.instagram_url && (
                <a
                  href={company.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="rounded-md border border-border p-2 text-muted-foreground hover:text-primary"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Website"
                  className="rounded-md border border-border p-2 text-muted-foreground hover:text-primary"
                >
                  <Globe className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
