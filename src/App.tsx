import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Login } from "./pages/Login";
import { AcessoNegado } from "./pages/AcessoNegado";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Dashboard } from "./pages/dashboard/Dashboard";
import { Entregadores } from "./pages/dashboard/Entregadores";
import { MapaPage } from "./pages/dashboard/MapaPage";
import { GerenciamentoUsuarios } from "./pages/dashboard/GerenciamentoUsuarios";
import { Pedidos } from "./pages/dashboard/Pedidos";
import { PedidoDetalhes } from "./pages/dashboard/PedidoDetalhes";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
      retry: 2,
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
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              <Route path="/acesso-negado" element={<AcessoNegado />} />
              <Route path="/dashboard" element={
                <ProtectedRoute requireAdmin>
                  <DashboardLayout onLogout={signOut} />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="entregadores" element={<Entregadores />} />
                <Route path="mapa" element={<MapaPage />} />
                <Route path="usuarios" element={<GerenciamentoUsuarios />} />
                <Route path="pedidos" element={<Pedidos />} />
                <Route path="pedidos/:id" element={<PedidoDetalhes />} />
                <Route path="financeiro" element={<div className="p-6"><h1 className="text-2xl font-bold">Financeiro - Em desenvolvimento</h1></div>} />
                <Route path="suporte" element={<div className="p-6"><h1 className="text-2xl font-bold">Suporte - Em desenvolvimento</h1></div>} />
                <Route path="notificacoes" element={<div className="p-6"><h1 className="text-2xl font-bold">Notificações - Em desenvolvimento</h1></div>} />
              </Route>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
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
