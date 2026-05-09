import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { Link } from "react-router-dom";
import { Search, Plus, MapPin, Mail, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import NewCandidateModal from "@/components/talents/NewCandidateModal";

export default function TalentList() {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["talents", debouncedSearch, tagFilter],
    queryFn: async () => {
      let query = supabase
        .from("candidates")
        .select("*, candidate_tags(tag_id, tags(id, name))")
        .order("created_at", { ascending: false });

      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (tagFilter) {
        return data.filter((c: any) =>
          c.candidate_tags?.some((ct: any) => ct.tag_id === tagFilter)
        );
      }
      return data;
    },
  });

  const { data: allTags } = useQuery({
    queryKey: ["all-tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Banco de Talentos</h1>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Candidato
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            className="pl-9"
            onChange={(e) => {
              setSearch(e.target.value);
              handleSearch(e.target.value);
            }}
            value={search}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTagFilter(null)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              !tagFilter ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Todas
          </button>
          {allTags?.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setTagFilter(tag.id === tagFilter ? null : tag.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                tagFilter === tag.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && (!candidates || candidates.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16">
          <p className="mb-2 text-lg font-medium text-foreground">Nenhum candidato encontrado</p>
          <p className="mb-4 text-sm text-muted-foreground">Comece adicionando candidatos ao banco de talentos.</p>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Candidato
          </Button>
        </div>
      )}

      {/* Table */}
      {!isLoading && candidates && candidates.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Cidade</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {candidates.map((c: any) => (
                <tr key={c.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link to={`/app/talentos/${c.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {c.city || "—"}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {c.candidate_tags?.map((ct: any) => (
                        <Badge key={ct.tag_id} variant="secondary" className="text-xs">
                          {ct.tags?.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewCandidateModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
