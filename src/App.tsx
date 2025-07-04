import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Dashboard } from "./pages/dashboard/Dashboard";
import { Entregadores } from "./pages/dashboard/Entregadores";
import { MapaPage } from "./pages/dashboard/MapaPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (credentials: { email: string; password: string }) => {
    // In production, implement proper authentication with Supabase
    console.log('Login attempt:', credentials);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {!isAuthenticated ? (
              <>
                <Route path="/" element={<Login onLogin={handleLogin} />} />
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              <>
                <Route path="/dashboard" element={<DashboardLayout onLogout={handleLogout} />}>
                  <Route index element={<Dashboard />} />
                  <Route path="entregadores" element={<Entregadores />} />
                  <Route path="mapa" element={<MapaPage />} />
                  <Route path="pedidos" element={<div className="p-6"><h1 className="text-2xl font-bold">Pedidos - Em desenvolvimento</h1></div>} />
                  <Route path="financeiro" element={<div className="p-6"><h1 className="text-2xl font-bold">Financeiro - Em desenvolvimento</h1></div>} />
                  <Route path="suporte" element={<div className="p-6"><h1 className="text-2xl font-bold">Suporte - Em desenvolvimento</h1></div>} />
                  <Route path="notificacoes" element={<div className="p-6"><h1 className="text-2xl font-bold">Notificações - Em desenvolvimento</h1></div>} />
                </Route>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<NotFound />} />
              </>
            )}
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
