import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Briefcase, Link2 } from "lucide-react";
import { toast } from "sonner";
import { getPublicJobUrl } from "@/lib/publicUrl";

const statusColors: Record<string, string> = {
  open: "bg-success/10 text-success border-success/30",
  draft: "bg-muted text-muted-foreground border-border",
  closed: "bg-destructive/10 text-destructive border-destructive/30",
};

const statusLabels: Record<string, string> = {
  open: "Aberta",
  draft: "Rascunho",
  closed: "Fechada",
};

export default function JobsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (search.trim()) {
        query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hub de Vagas</h1>
          <p className="text-muted-foreground">Gerencie todas as vagas da empresa.</p>
        </div>
        <Button asChild>
          <Link to="/app/vagas/nova">
            <Plus className="mr-2 h-4 w-4" />
            Nova vaga
          </Link>
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou localização..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Aberta</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="closed">Fechada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando...</div>
      ) : !jobs?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-foreground">Nenhuma vaga encontrada</p>
          <p className="text-muted-foreground">Crie sua primeira vaga para começar.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Link público</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id} className="cursor-pointer">
                  <TableCell>
                    <Link to={`/app/vagas/${job.id}`} className="font-medium text-primary hover:underline">
                      {job.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{job.location || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{job.type || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[job.status] || ""}>
                      {statusLabels[job.status] || job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(job.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    {job.status === "open" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const url = getPublicJobUrl(job.id);
                          navigator.clipboard.writeText(url);
                          toast.success("Link público copiado!", { description: url });
                        }}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
