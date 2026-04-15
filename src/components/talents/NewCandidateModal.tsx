import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NewCandidateModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const reset = () => {
    setName(""); setEmail(""); setPhone(""); setCity(""); setLinkedinUrl("");
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome é obrigatório."); return; }
    if (!email.trim() || !email.includes("@")) { toast.error("Email válido é obrigatório."); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from("candidates").insert({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        city: city.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("Já existe um candidato com este email.");
        } else {
          throw error;
        }
        return;
      }
      toast.success("Candidato criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["talents"] });
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar candidato.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Novo Candidato</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" /></div>
          <div><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" /></div>
          <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" /></div>
          <div><Label>Cidade</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo, SP" /></div>
          <div><Label>LinkedIn</Label><Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." /></div>
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Criar candidato"}
          </Button>
        </div>
      </div>
    </div>
  );
}
