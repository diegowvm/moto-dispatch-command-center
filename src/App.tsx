import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import PerformancePage from "@/pages/dashboard/PerformancePage";
import { ProgressiveLoader, useLazyWithRetry } from "@/components/ui/progressive-loader";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { useAuth } from "@/hooks/useAuth";

// Lazy loading das páginas
const Login = useLazyWithRetry(() => import("./pages/Login"));
const AcessoNegado = useLazyWithRetry(() => import("./pages/AcessoNegado"));
const DashboardLayout = useLazyWithRetry(() => import("./components/layout/DashboardLayout"));
const Dashboard = useLazyWithRetry(() => import("./pages/dashboard/Dashboard"));
const Entregadores = useLazyWithRetry(() => import("./pages/dashboard/Entregadores"));
const GerenciamentoUsuarios = useLazyWithRetry(() => import("./pages/dashboard/GerenciamentoUsuarios"));
const Pedidos = useLazyWithRetry(() => import("./pages/dashboard/Pedidos"));
const PedidoDetalhes = useLazyWithRetry(() => import("./pages/dashboard/PedidoDetalhes"));
const MapaPage = useLazyWithRetry(() => import("./pages/dashboard/MapaPage"));
const ModuloFinanceiro = useLazyWithRetry(() => import("./pages/dashboard/ModuloFinanceiro"));
const GerenciamentoTermos = useLazyWithRetry(() => import("./pages/dashboard/GerenciamentoTermos"));
const ComunicacaoNotificacoes = useLazyWithRetry(() => import("./pages/dashboard/ComunicacaoNotificacoes"));
const NotFound = useLazyWithRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutos
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Não retry em erros 403/404
        if (error?.message?.includes('403') || error?.message?.includes('404')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 1,
    },
  },
});

const AppContent = () => {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando aplicação...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {!user ? (
              <>
                <Route path="/" element={
                  <ProgressiveLoader>
                    <Login />
                  </ProgressiveLoader>
                } />
                <Route path="/login" element={
                  <ProgressiveLoader>
                    <Login />
                  </ProgressiveLoader>
                } />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            ) : (
              <>
                <Route path="/acesso-negado" element={
                  <ProgressiveLoader>
                    <AcessoNegado />
                  </ProgressiveLoader>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute requireAdmin>
                    <ProgressiveLoader fallback={<DashboardSkeleton />}>
                      <DashboardLayout onLogout={signOut} />
                    </ProgressiveLoader>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <ProgressiveLoader fallback={<DashboardSkeleton />}>
                      <Dashboard />
                    </ProgressiveLoader>
                  } />
                  <Route path="entregadores" element={
                    <ProgressiveLoader>
                      <Entregadores />
                    </ProgressiveLoader>
                  } />
                  <Route path="mapa" element={
                    <ProgressiveLoader>
                      <MapaPage />
                    </ProgressiveLoader>
                  } />
                  <Route path="usuarios" element={
                    <ProgressiveLoader>
                      <GerenciamentoUsuarios />
                    </ProgressiveLoader>
                  } />
                  <Route path="pedidos" element={
                    <ProgressiveLoader>
                      <Pedidos />
                    </ProgressiveLoader>
                  } />
                  <Route path="pedidos/:id" element={
                    <ProgressiveLoader>
                      <PedidoDetalhes />
                    </ProgressiveLoader>
                  } />
                  <Route path="performance" element={
                    <ProgressiveLoader>
                      <PerformancePage />
                    </ProgressiveLoader>
                  } />
                  <Route path="financeiro" element={
                    <ProgressiveLoader>
                      <ModuloFinanceiro />
                    </ProgressiveLoader>
                  } />
                  <Route path="termos" element={
                    <ProgressiveLoader>
                      <GerenciamentoTermos />
                    </ProgressiveLoader>
                  } />
                  <Route path="comunicacao" element={
                    <ProgressiveLoader>
                      <ComunicacaoNotificacoes />
                    </ProgressiveLoader>
                  } />
                  <Route path="suporte" element={
                    <ProgressiveLoader>
                      <div className="p-6"><h1 className="text-2xl font-bold">Suporte - Em desenvolvimento</h1></div>
                    </ProgressiveLoader>
                  } />
                  <Route path="notificacoes" element={
                    <ProgressiveLoader>
                      <ComunicacaoNotificacoes />
                    </ProgressiveLoader>
                  } />
                </Route>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={
                  <ProgressiveLoader>
                    <NotFound />
                  </ProgressiveLoader>
                } />
              </>
            )}
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeProvider>
          <AppContent />
        </RealtimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

