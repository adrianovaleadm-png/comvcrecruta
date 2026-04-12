import { useAuth } from "@/contexts/AuthContext";
import { Briefcase, Users, BarChart3, MessageSquare } from "lucide-react";

const stats = [
  { label: "Vagas Ativas", value: "0", icon: Briefcase },
  { label: "Candidatos", value: "0", icon: Users },
  { label: "Entrevistas", value: "0", icon: MessageSquare },
  { label: "Contratações", value: "0", icon: BarChart3 },
];

export default function Painel() {
  const { company } = useAuth();

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground mb-1">Painel</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Bem-vindo ao painel da {company?.nome_fantasia || "sua empresa"}.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="p-5 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold text-card-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">Crie sua primeira vaga para começar a receber candidatos.</p>
      </div>
    </div>
  );
}
