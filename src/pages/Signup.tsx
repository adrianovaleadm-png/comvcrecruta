import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";

const setores = [
  "Tecnologia", "Saúde", "Educação", "Finanças", "Varejo", "Indústria",
  "Consultoria", "Marketing", "Jurídico", "Engenharia", "Outro",
];

const tamanhos = [
  "1-10 funcionários", "11-50", "51-200", "201-500", "501-1000", "1000+",
];

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userType = searchParams.get("type") as "candidato" | "empresa" | "recrutador" | null;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2 fields (empresa only)
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [setor, setSetor] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [website, setWebsite] = useState("");

  if (!userType || !["candidato", "empresa", "recrutador"].includes(userType)) {
    navigate("/");
    return null;
  }

  const isEmpresa = userType === "empresa";
  const totalSteps = isEmpresa ? 2 : 1;

  const validateStep1 = () => {
    if (!fullName.trim()) return "Nome completo é obrigatório.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email inválido.";
    if (isEmpresa && !cargo.trim()) return "Cargo é obrigatório.";
    if (password.length < 6) return "Senha deve ter pelo menos 6 caracteres.";
    if (password !== confirmPassword) return "Senhas não coincidem.";
    return null;
  };

  const validateStep2 = () => {
    if (!nomeFantasia.trim()) return "Nome Fantasia é obrigatório.";
    if (!razaoSocial.trim()) return "Razão Social é obrigatória.";
    if (!cnpj.trim()) return "CNPJ é obrigatório.";
    const cnpjClean = cnpj.replace(/\D/g, "");
    if (cnpjClean.length !== 14) return "CNPJ deve ter 14 dígitos.";
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError("");
    setStep(2);
  };

  const handleSubmit = async () => {
    if (isEmpresa && step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
    } else if (!isEmpresa) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    }

    setError("");
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário.");

      const userId = authData.user.id;

      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        user_type: userType,
        full_name: fullName,
        email,
      });
      if (profileError) throw profileError;

      if (isEmpresa) {
        const cnpjClean = cnpj.replace(/\D/g, "");
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .insert({
            nome_fantasia: nomeFantasia,
            razao_social: razaoSocial,
            cnpj: cnpjClean,
            setor: setor || null,
            tamanho: tamanho || null,
            website: website || null,
          })
          .select()
          .single();
        if (companyError) throw companyError;

        const { error: memberError } = await supabase.from("company_members").insert({
          company_id: companyData.id,
          user_id: userId,
          cargo,
          role_empresa: "admin",
        });
        if (memberError) throw memberError;
      }

      navigate("/verify-email");
    } catch (err: any) {
      const detail = err?.message || JSON.stringify(err);
      const code = err?.code ? ` [code: ${err.code}]` : "";
      const hint = err?.hint ? ` Hint: ${err.hint}` : "";
      const details = err?.details ? ` Details: ${err.details}` : "";
      setError(`${detail}${code}${hint}${details}`);
      console.error("Signup error:", err);
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<string, string> = {
    candidato: "Criar Conta — Candidato",
    empresa: "Criar Conta — Empresa",
    recrutador: "Criar Conta — Recrutador",
  };

  const inputClass = "w-full px-3 py-2.5 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";
  const labelClass = "block text-sm font-medium text-foreground mb-1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <button onClick={() => step === 2 ? setStep(1) : navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-1">{titles[userType]}</h1>
        {isEmpresa && (
          <p className="text-sm text-muted-foreground mb-6">Passo {step} de {totalSteps}</p>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nome Completo</label>
              <input className={inputClass} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome completo" />
            </div>
            <div>
              <label className={labelClass}>{isEmpresa ? "Email Corporativo" : "Email"}</label>
              <input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            {isEmpresa && (
              <div>
                <label className={labelClass}>Cargo na Empresa</label>
                <input className={inputClass} value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Diretor de RH" />
              </div>
            )}
            <div>
              <label className={labelClass}>Senha</label>
              <input className={inputClass} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className={labelClass}>Confirmar Senha</label>
              <input className={inputClass} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
            </div>

            {isEmpresa ? (
              <button onClick={handleNext} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition flex items-center justify-center gap-2">
                Próximo <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Conta"}
              </button>
            )}
          </div>
        )}

        {step === 2 && isEmpresa && (
          <div className="space-y-4 mt-4">
            <div>
              <label className={labelClass}>Nome Fantasia</label>
              <input className={inputClass} value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} placeholder="Nome da empresa" />
            </div>
            <div>
              <label className={labelClass}>Razão Social</label>
              <input className={inputClass} value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} placeholder="Razão social completa" />
            </div>
            <div>
              <label className={labelClass}>CNPJ</label>
              <input className={inputClass} value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <label className={labelClass}>Setor</label>
              <select className={inputClass} value={setor} onChange={e => setSetor(e.target.value)}>
                <option value="">Selecione...</option>
                {setores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tamanho da Empresa</label>
              <select className={inputClass} value={tamanho} onChange={e => setTamanho(e.target.value)}>
                <option value="">Selecione...</option>
                {tamanhos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Website (opcional)</label>
              <input className={inputClass} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://suaempresa.com" />
            </div>

            <button onClick={handleSubmit} disabled={loading} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Empresa e Conta"}
            </button>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Já tem conta?{" "}
          <button onClick={() => navigate("/login")} className="text-primary font-medium hover:underline">Entrar</button>
        </p>
      </div>
    </div>
  );
}
