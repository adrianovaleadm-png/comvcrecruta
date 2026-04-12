import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import VerifyEmail from "./pages/VerifyEmail";
import Onboarding from "./pages/Onboarding";
import CandidatoPlaceholder from "./pages/CandidatoPlaceholder";
import AppLayout from "./pages/AppLayout";
import Painel from "./pages/app/Painel";
import PlaceholderPage from "./pages/app/PlaceholderPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedTypes }: { children: React.ReactNode; allowedTypes?: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (allowedTypes && !allowedTypes.includes(profile.user_type)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function EmpresaRoute({ children }: { children: React.ReactNode }) {
  const { profile, company, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.user_type === "empresa" && (!company || company.status_onboarding === "pendente")) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <ProtectedRoute allowedTypes={["empresa", "recrutador"]}>
      {children}
    </ProtectedRoute>
  );
}

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (user && profile) {
    if (profile.user_type === "candidato") return <Navigate to="/candidato" replace />;
    if (profile.user_type === "empresa") {
      return <Navigate to={profile ? "/app" : "/onboarding"} replace />;
    }
    if (profile.user_type === "recrutador") return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AuthRedirect><Index /></AuthRedirect>} />
      <Route path="/signup" element={<AuthRedirect><Signup /></AuthRedirect>} />
      <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route path="/onboarding" element={
        <ProtectedRoute allowedTypes={["empresa"]}>
          <Onboarding />
        </ProtectedRoute>
      } />

      <Route path="/candidato" element={
        <ProtectedRoute allowedTypes={["candidato"]}>
          <CandidatoPlaceholder />
        </ProtectedRoute>
      } />

      <Route path="/app" element={
        <EmpresaRoute>
          <AppLayout />
        </EmpresaRoute>
      }>
        <Route index element={<Painel />} />
        <Route path="vagas" element={<PlaceholderPage title="Hub de Vagas" description="Gerencie todas as vagas da empresa." />} />
        <Route path="mensagens" element={<PlaceholderPage title="Mensagens" description="Comunique-se com candidatos e equipe." />} />
        <Route path="vagas-internas" element={<PlaceholderPage title="Vagas Internas" description="Vagas exclusivas para colaboradores." />} />
        <Route path="indicacoes" element={<PlaceholderPage title="Indicações" description="Programa de indicação de candidatos." />} />
        <Route path="analytics" element={<PlaceholderPage title="Analytics" description="Relatórios e métricas de recrutamento." />} />
        <Route path="equipe" element={<PlaceholderPage title="Equipe" description="Gerencie membros e permissões." />} />
        <Route path="requisicoes" element={<PlaceholderPage title="Requisições" description="Aprovações e fluxos de requisição de vagas." />} />
        <Route path="templates" element={<PlaceholderPage title="Templates" description="Modelos de vagas e comunicações." />} />
        <Route path="carreiras" element={<PlaceholderPage title="Página de Carreiras" description="Configure sua página pública de carreiras." />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
