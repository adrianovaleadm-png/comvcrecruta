import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Upload, X } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const { company, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [descricao, setDescricao] = useState(company?.descricao || "");
  const [endereco, setEndereco] = useState(company?.endereco || "");
  const [telefone, setTelefone] = useState(company?.telefone_comercial || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logo_url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Apenas imagens são permitidas."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Arquivo deve ter no máximo 2MB."); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async () => {
    if (!company) return;
    setLoading(true);
    setError("");

    try {
      let logoUrl = company.logo_url;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${company.id}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("company-logos")
          .upload(path, logoFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("company-logos")
          .getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("companies")
        .update({
          descricao: descricao || null,
          endereco: endereco || null,
          telefone_comercial: telefone || null,
          logo_url: logoUrl,
          status_onboarding: "completo",
        })
        .eq("id", company.id);

      if (updateError) throw updateError;

      await refreshProfile();
      navigate("/app");
    } catch (err: any) {
      setError(err.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";
  const labelClass = "block text-sm font-medium text-foreground mb-1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground mb-2">Complete o perfil da empresa</h1>
        <p className="text-muted-foreground mb-8 text-sm">Estas informações ajudam candidatos a conhecerem melhor sua empresa.</p>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        <div className="space-y-5">
          <div>
            <label className={labelClass}>Logo da Empresa</label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative w-20 h-20 rounded-lg border border-border overflow-hidden">
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-primary transition text-muted-foreground"
                >
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-[10px]">Upload</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Descrição da Empresa</label>
            <textarea className={inputClass + " min-h-[100px] resize-none"} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Conte um pouco sobre a empresa..." />
          </div>

          <div>
            <label className={labelClass}>Endereço</label>
            <input className={inputClass} value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, número, cidade, estado" />
          </div>

          <div>
            <label className={labelClass}>Telefone Comercial</label>
            <input className={inputClass} value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>

          <button onClick={handleSubmit} disabled={loading} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar e Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
