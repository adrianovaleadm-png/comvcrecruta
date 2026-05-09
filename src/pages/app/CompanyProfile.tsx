import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Heart, Gift, Share2, Upload, X, Plus, Loader2 } from "lucide-react";

const BENEFICIO_SUGESTOES = [
  "Vale Refeição", "Vale Alimentação", "Plano de Saúde", "Plano Odontológico",
  "Gympass / Wellhub", "Home Office", "Vale Transporte", "Auxílio Creche",
  "PLR / Bônus", "Stock Options", "Day Off Aniversário", "Licença Parental Estendida",
];

const TAMANHO_OPCOES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const MODELO_OPCOES = [
  { value: "remoto", label: "100% Remoto" },
  { value: "hibrido", label: "Híbrido" },
  { value: "presencial", label: "Presencial" },
];

export default function CompanyProfile() {
  const { company: ctxCompany, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form de criação inicial
  const [novoNomeFantasia, setNovoNomeFantasia] = useState("");
  const [novoRazaoSocial, setNovoRazaoSocial] = useState("");
  const [novoCnpj, setNovoCnpj] = useState("");

  // Geral
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [setor, setSetor] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [website, setWebsite] = useState("");
  const [descricao, setDescricao] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Cultura
  const [proposito, setProposito] = useState("");
  const [missao, setMissao] = useState("");
  const [visao, setVisao] = useState("");
  const [valores, setValores] = useState("");
  const [ambienteTrabalho, setAmbienteTrabalho] = useState("");
  const [diferenciais, setDiferenciais] = useState<string[]>([]);
  const [novoDiferencial, setNovoDiferencial] = useState("");
  const [politicasDei, setPoliticasDei] = useState("");
  const [modeloTrabalho, setModeloTrabalho] = useState<string>("");

  // Benefícios
  const [beneficios, setBeneficios] = useState<string[]>([]);
  const [novoBeneficio, setNovoBeneficio] = useState("");

  // Redes
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");

  useEffect(() => {
    (async () => {
      let id = ctxCompany?.id;
      if (!id) {
        // Dev: tenta usar a última empresa selecionada nesta sessão
        const stored = localStorage.getItem("dev_company_id");
        if (stored) {
          const { data } = await supabase.from("companies").select("id").eq("id", stored).maybeSingle();
          if (data) id = data.id;
        }
        // Fallback: empresa mais recente (determinístico)
        if (!id) {
          const { data } = await supabase
            .from("companies")
            .select("id")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          id = data?.id;
        }
      }
      if (!id) { setLoading(false); return; }
      setCompanyId(id);
      localStorage.setItem("dev_company_id", id);

      const { data: c } = await supabase.from("companies").select("*").eq("id", id).single();
      if (c) {
        const ca = c as any;
        setNomeFantasia(c.nome_fantasia || "");
        setRazaoSocial(c.razao_social || "");
        setCnpj(c.cnpj || "");
        setSetor(c.setor || "");
        setTamanho(c.tamanho || "");
        setEndereco(c.endereco || "");
        setTelefone(c.telefone_comercial || "");
        setWebsite(c.website || "");
        setDescricao(c.descricao || "");
        setLogoUrl(c.logo_url);
        setProposito(ca.proposito || "");
        setMissao(ca.missao || "");
        setVisao(ca.visao || "");
        setValores(ca.valores || "");
        setAmbienteTrabalho(ca.ambiente_trabalho || "");
        setDiferenciais(ca.diferenciais || []);
        setPoliticasDei(ca.politicas_dei || "");
        setModeloTrabalho(ca.modelo_trabalho || "");
        setBeneficios(ca.beneficios || []);
        setLinkedinUrl(ca.linkedin_url || "");
        setInstagramUrl(ca.instagram_url || "");
      }
      setLoading(false);
    })();
  }, [ctxCompany?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Apenas imagens."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Máximo 2MB."); return; }
    setLogoFile(file);
    setLogoUrl(URL.createObjectURL(file));
  };

  const addBeneficio = (b: string) => {
    const v = b.trim();
    if (!v || beneficios.includes(v)) return;
    setBeneficios([...beneficios, v]);
    setNovoBeneficio("");
  };
  const removeBeneficio = (b: string) => setBeneficios(beneficios.filter(x => x !== b));

  const addDiferencial = () => {
    const v = novoDiferencial.trim();
    if (!v || diferenciais.includes(v)) return;
    setDiferenciais([...diferenciais, v]);
    setNovoDiferencial("");
  };
  const removeDiferencial = (d: string) => setDiferenciais(diferenciais.filter(x => x !== d));

  const handleCreateCompany = async () => {
    if (!novoNomeFantasia.trim() || !novoRazaoSocial.trim() || !novoCnpj.trim()) {
      toast.error("Preencha nome fantasia, razão social e CNPJ.");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("companies")
        .insert({
          nome_fantasia: novoNomeFantasia.trim(),
          razao_social: novoRazaoSocial.trim(),
          cnpj: novoCnpj.trim(),
        })
        .select("id")
        .single();
      if (error) throw error;
      setCompanyId(data.id);
      localStorage.setItem("dev_company_id", data.id);
      setNomeFantasia(novoNomeFantasia.trim());
      setRazaoSocial(novoRazaoSocial.trim());
      setCnpj(novoCnpj.trim());
      toast.success("Empresa criada! Complete o perfil abaixo.");
      await refreshProfile();
    } catch (err: any) {
      if (err.code === "23505" && String(err.message).toLowerCase().includes("cnpj")) {
        toast.error("Já existe uma empresa cadastrada com este CNPJ.");
      } else {
        toast.error(err.message || "Erro ao criar empresa.");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) { toast.error("Empresa não encontrada."); return; }
    if (!nomeFantasia.trim() || !razaoSocial.trim() || !cnpj.trim()) {
      toast.error("Nome fantasia, razão social e CNPJ são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${companyId}/logo.${ext}`;
        const { error: upErr } = await supabase.storage.from("company-logos").upload(path, logoFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("company-logos").getPublicUrl(path);
        finalLogoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("companies").update({
        nome_fantasia: nomeFantasia,
        razao_social: razaoSocial,
        cnpj,
        setor: setor || null,
        tamanho: tamanho || null,
        endereco: endereco || null,
        telefone_comercial: telefone || null,
        website: website || null,
        descricao: descricao || null,
        logo_url: finalLogoUrl,
        proposito: proposito || null,
        missao: missao || null,
        visao: visao || null,
        valores: valores || null,
        ambiente_trabalho: ambienteTrabalho || null,
        diferenciais,
        politicas_dei: politicasDei || null,
        modelo_trabalho: modeloTrabalho || null,
        beneficios,
        linkedin_url: linkedinUrl || null,
        instagram_url: instagramUrl || null,
      } as any).eq("id", companyId);
      if (error) throw error;
      toast.success("Perfil da empresa salvo com sucesso!");
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!companyId) {
    return (
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Criar empresa</h1>
              <p className="text-sm text-muted-foreground">Comece com os dados básicos. Você poderá completar o perfil em seguida.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Nome Fantasia *</Label>
              <Input value={novoNomeFantasia} onChange={e => setNovoNomeFantasia(e.target.value)} placeholder="Ex: Acme Tech" />
            </div>
            <div>
              <Label>Razão Social *</Label>
              <Input value={novoRazaoSocial} onChange={e => setNovoRazaoSocial(e.target.value)} placeholder="Ex: Acme Tecnologia LTDA" />
            </div>
            <div>
              <Label>CNPJ *</Label>
              <Input value={novoCnpj} onChange={e => setNovoCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
          </div>
          <Button onClick={handleCreateCompany} disabled={creating} className="w-full">
            {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</> : "Criar empresa"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perfil da Empresa</h1>
          <p className="text-sm text-muted-foreground">Gerencie dados, cultura, benefícios e redes sociais.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : "Salvar alterações"}
        </Button>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="geral"><Building2 className="h-4 w-4 mr-1.5" /> Geral</TabsTrigger>
          <TabsTrigger value="cultura"><Heart className="h-4 w-4 mr-1.5" /> Cultura</TabsTrigger>
          <TabsTrigger value="beneficios"><Gift className="h-4 w-4 mr-1.5" /> Benefícios</TabsTrigger>
          <TabsTrigger value="redes"><Share2 className="h-4 w-4 mr-1.5" /> Redes</TabsTrigger>
        </TabsList>

        {/* GERAL */}
        <TabsContent value="geral" className="space-y-4 mt-4">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border">
                {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <Building2 className="h-8 w-8 text-muted-foreground" />}
              </div>
              <div className="space-y-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Trocar logo
                </Button>
                <p className="text-xs text-muted-foreground">PNG ou JPG, máx 2MB.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Nome Fantasia *</Label><Input value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} /></div>
              <div><Label>Razão Social *</Label><Input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} /></div>
              <div><Label>CNPJ *</Label><Input value={cnpj} onChange={e => setCnpj(e.target.value)} /></div>
              <div><Label>Setor</Label><Input value={setor} onChange={e => setSetor(e.target.value)} placeholder="Ex: Tecnologia" /></div>
              <div>
                <Label>Tamanho</Label>
                <Select value={tamanho || undefined} onValueChange={setTamanho}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TAMANHO_OPCOES.map(t => <SelectItem key={t} value={t}>{t} colaboradores</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Endereço</Label><Input value={endereco} onChange={e => setEndereco(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Website</Label><Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." /></div>
              <div className="sm:col-span-2">
                <Label>Descrição curta</Label>
                <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} placeholder="Resumo de uma frase sobre a empresa..." />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* CULTURA */}
        <TabsContent value="cultura" className="space-y-4 mt-4">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div>
              <Label>Propósito (manifesto)</Label>
              <Textarea value={proposito} onChange={e => setProposito(e.target.value)} rows={3} placeholder="Por que existimos? Qual nossa razão de ser?" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Missão</Label>
                <Textarea value={missao} onChange={e => setMissao(e.target.value)} rows={3} placeholder="O que fazemos hoje" />
              </div>
              <div>
                <Label>Visão</Label>
                <Textarea value={visao} onChange={e => setVisao(e.target.value)} rows={3} placeholder="Onde queremos chegar" />
              </div>
            </div>
            <div>
              <Label>Valores (um por linha)</Label>
              <Textarea value={valores} onChange={e => setValores(e.target.value)} rows={5} placeholder={"Transparência\nColaboração\nExcelência"} />
            </div>
            <div>
              <Label>Ambiente de trabalho</Label>
              <Textarea value={ambienteTrabalho} onChange={e => setAmbienteTrabalho(e.target.value)} rows={3} placeholder="Como é o dia a dia, o clima, o ritmo..." />
            </div>
            <div>
              <Label>Diferenciais</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={novoDiferencial}
                  onChange={e => setNovoDiferencial(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addDiferencial())}
                  placeholder="Ex: Cultura horizontal, mentorias semanais..."
                />
                <Button type="button" variant="outline" onClick={addDiferencial}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {diferenciais.map(d => (
                  <Badge key={d} variant="secondary" className="gap-1.5">
                    {d}
                    <button onClick={() => removeDiferencial(d)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Políticas de Diversidade, Equidade e Inclusão (DEI)</Label>
              <Textarea value={politicasDei} onChange={e => setPoliticasDei(e.target.value)} rows={3} placeholder="Como promovemos diversidade e inclusão..." />
            </div>
            <div>
              <Label>Modelo de trabalho padrão</Label>
              <Select value={modeloTrabalho || undefined} onValueChange={setModeloTrabalho}>
                <SelectTrigger className="max-w-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {MODELO_OPCOES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        {/* BENEFÍCIOS */}
        <TabsContent value="beneficios" className="space-y-4 mt-4">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div>
              <Label>Adicionar benefício</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={novoBeneficio}
                  onChange={e => setNovoBeneficio(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addBeneficio(novoBeneficio))}
                  placeholder="Digite e pressione Enter"
                />
                <Button type="button" variant="outline" onClick={() => addBeneficio(novoBeneficio)}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">SUGESTÕES RÁPIDAS</p>
              <div className="flex flex-wrap gap-2">
                {BENEFICIO_SUGESTOES.filter(b => !beneficios.includes(b)).map(b => (
                  <button key={b} onClick={() => addBeneficio(b)} className="text-xs px-2.5 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    + {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">BENEFÍCIOS ATIVOS ({beneficios.length})</p>
              {beneficios.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum benefício adicionado.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {beneficios.map(b => (
                    <Badge key={b} className="gap-1.5">
                      {b}
                      <button onClick={() => removeBeneficio(b)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* REDES */}
        <TabsContent value="redes" className="space-y-4 mt-4">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div><Label>Website</Label><Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://suaempresa.com" /></div>
            <div><Label>LinkedIn</Label><Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/company/..." /></div>
            <div><Label>Instagram</Label><Input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." /></div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
