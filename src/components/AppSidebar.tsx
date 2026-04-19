import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, MessageSquare, Building2,
  Users, BarChart3, FileText, Globe, Award, LogOut, Menu, X, UserSearch, Heart
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: "RECRUTAMENTO",
    items: [
      { label: "Painel", icon: LayoutDashboard, path: "/app" },
      { label: "Hub de Vagas", icon: Briefcase, path: "/app/vagas" },
      { label: "Banco de Talentos", icon: UserSearch, path: "/app/talentos" },
    ],
  },
  {
    title: "COMUNICAÇÃO",
    items: [
      { label: "Mensagens", icon: MessageSquare, path: "/app/mensagens" },
    ],
  },
  {
    title: "PROGRAMAS",
    items: [
      { label: "Vagas Internas", icon: Building2, path: "/app/vagas-internas" },
      { label: "Indicações", icon: Award, path: "/app/indicacoes" },
    ],
  },
  {
    title: "RELATÓRIOS",
    items: [
      { label: "Analytics", icon: BarChart3, path: "/app/analytics" },
    ],
  },
  {
    title: "ADMINISTRADOR",
    items: [
      { label: "Empresa", icon: Heart, path: "/app/empresa" },
      { label: "Equipe", icon: Users, path: "/app/equipe" },
      { label: "Requisições", icon: FileText, path: "/app/requisicoes" },
      { label: "Templates", icon: FileText, path: "/app/templates" },
      { label: "Página de Carreiras", icon: Globe, path: "/app/carreiras" },
    ],
  },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/app" ? location.pathname === "/app" : location.pathname.startsWith(path);

  const sidebar = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-accent-foreground">
            R
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Recrutamento Inteligente</p>
            <p className="text-[11px] text-sidebar-muted truncate">Modo desenvolvimento</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-semibold tracking-wider text-sidebar-muted px-2 mb-1.5">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.path}>
                  <button
                    onClick={() => { navigate(item.path); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                      isActive(item.path)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => navigate("/login")}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Login</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 md:hidden w-10 h-10 rounded-md bg-card border border-border flex items-center justify-center"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebar}
      </div>

      <div className="hidden md:block w-60 flex-shrink-0 h-screen sticky top-0">
        {sidebar}
      </div>
    </>
  );
}
