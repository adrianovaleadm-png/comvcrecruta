import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Search, UserPlus, Users } from "lucide-react";
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

  // New candidate form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Existing candidate search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  const firstStageId = stages.sort((a, b) => a.order_index - b.order_index)[0]?.id;

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setPhone("");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedCandidate(null);
      setTab("new");
    }
  }, [open]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    searchDebounce.current = setTimeout(async () => {
      const { data } = await supabase
        .from("candidates")
        .select("*")
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);
      setSearchResults(data || []);
    }, 300);
  }, [searchQuery]);

  const handleCreateNew = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Nome e email são obrigatórios.");
      return;
    }
    if (!firstStageId) {
      toast.error("Nenhuma etapa encontrada para esta vaga.");
      return;
    }
    setSaving(true);
    try {
      // Check if candidate with same email exists
      const { data: existing } = await supabase
        .from("candidates")
        .select("id")
        .eq("email", email.trim())
        .maybeSingle();

      let candidateId: string;
      if (existing) {
        candidateId = existing.id;
      } else {
        const { data: newCandidate, error } = await supabase
          .from("candidates")
          .insert({ name: name.trim(), email: email.trim(), phone: phone.trim() || null })
          .select("id")
          .single();
        if (error) throw error;
        candidateId = newCandidate.id;
      }

      const { error: appError } = await supabase.from("applications").insert({
        job_id: jobId,
        candidate_id: candidateId,
        stage_id: firstStageId,
        status: "active",
      });
      if (appError) throw appError;

      toast.success("Candidato adicionado ao pipeline!");
      queryClient.invalidateQueries({ queryKey: ["pipeline-applications", jobId] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar candidato.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddExisting = async () => {
    if (!selectedCandidate || !firstStageId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("applications").insert({
        job_id: jobId,
        candidate_id: selectedCandidate.id,
        stage_id: firstStageId,
        status: "active",
      });
      if (error) throw error;

      toast.success("Candidato adicionado ao pipeline!");
      queryClient.invalidateQueries({ queryKey: ["pipeline-applications", jobId] });
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
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Adicionar Candidato</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

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
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <Button className="w-full" onClick={handleCreateNew} disabled={saving}>
              {saving ? "Salvando..." : "Adicionar ao pipeline"}
            </Button>
          </div>
        )}

        {tab === "existing" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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

            <Button
              className="w-full"
              onClick={handleAddExisting}
              disabled={!selectedCandidate || saving}
            >
              {saving ? "Salvando..." : "Adicionar ao pipeline"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
