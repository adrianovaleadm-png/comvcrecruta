import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
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

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/candidato" element={<CandidatoPlaceholder />} />

      <Route path="/app" element={<AppLayout />}>
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
