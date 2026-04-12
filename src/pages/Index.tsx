import { useNavigate } from "react-router-dom";
import { Building2, User, Search } from "lucide-react";

const userTypes = [
  {
    type: "candidato",
    title: "Sou Candidato",
    description: "Encontre as melhores oportunidades e gerencie suas candidaturas em um só lugar.",
    icon: User,
  },
  {
    type: "empresa",
    title: "Sou Empresa",
    description: "Publique vagas, gerencie processos seletivos e encontre os melhores talentos.",
    icon: Building2,
  },
  {
    type: "recrutador",
    title: "Sou Recrutador",
    description: "Acesse ferramentas avançadas de busca e gestão de candidatos.",
    icon: Search,
  },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-4xl font-bold text-foreground mb-3">
          Recrutamento <span className="text-primary">Inteligente</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Plataforma completa de recrutamento e seleção. Escolha seu perfil para começar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full animate-fade-in">
        {userTypes.map((item) => (
          <button
            key={item.type}
            onClick={() => navigate(`/signup?type=${item.type}`)}
            className="group flex flex-col items-center p-8 rounded-lg border border-border bg-card hover:border-primary hover:shadow-lg transition-all duration-200 text-left"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
              <item.icon className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-card-foreground mb-2">{item.title}</h2>
            <p className="text-sm text-muted-foreground text-center">{item.description}</p>
          </button>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <button onClick={() => navigate("/login")} className="text-primary font-medium hover:underline">
          Entrar
        </button>
      </p>
    </div>
  );
}
