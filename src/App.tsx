import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import Carreiras from "./pages/Carreiras";
import AppLayout from "./pages/AppLayout";
import Painel from "./pages/app/Painel";
import PlaceholderPage from "./pages/app/PlaceholderPage";
import JobsList from "./pages/app/JobsList";
import JobCreate from "./pages/app/JobCreate";
import JobDetail from "./pages/app/JobDetail";
import JobEdit from "./pages/app/JobEdit";
import Pipeline from "./pages/app/Pipeline";
import TalentList from "./pages/app/TalentList";
import TalentProfile from "./pages/app/TalentProfile";
import Analytics from "./pages/app/Analytics";
import CompanyProfile from "./pages/app/CompanyProfile";
import PublicApplication from "./pages/app/PublicApplication";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/candidato" element={<CandidatoPlaceholder />} />
      <Route path="/carreiras" element={<Carreiras />} />
      <Route path="/vaga/:id/candidatar" element={<PublicApplication />} />

      <Route path="/app" element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Painel />} />
          <Route path="vagas" element={<JobsList />} />
          <Route path="vagas/nova" element={<JobCreate />} />
          <Route path="vagas/:id" element={<JobDetail />} />
          <Route path="vagas/:id/editar" element={<JobEdit />} />
          <Route path="vagas/:id/pipeline" element={<Pipeline />} />
          <Route path="talentos" element={<TalentList />} />
          <Route path="talentos/:id" element={<TalentProfile />} />
          <Route path="mensagens" element={<PlaceholderPage title="Mensagens" description="Comunique-se com candidatos e equipe." />} />
          <Route path="vagas-internas" element={<PlaceholderPage title="Vagas Internas" description="Vagas exclusivas para colaboradores." />} />
          <Route path="indicacoes" element={<PlaceholderPage title="Indicações" description="Programa de indicação de candidatos." />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="empresa" element={<CompanyProfile />} />
          <Route path="equipe" element={<PlaceholderPage title="Equipe" description="Gerencie membros e permissões." />} />
          <Route path="requisicoes" element={<PlaceholderPage title="Requisições" description="Aprovações e fluxos de requisição de vagas." />} />
          <Route path="templates" element={<PlaceholderPage title="Templates" description="Modelos de vagas e comunicações." />} />
          <Route path="carreiras" element={<PlaceholderPage title="Página de Carreiras" description="Configure sua página pública de carreiras." />} />
        </Route>
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
