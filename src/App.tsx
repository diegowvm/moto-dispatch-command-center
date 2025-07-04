import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { Login } from "./pages/Login";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Dashboard } from "./pages/dashboard/Dashboard";
import { Entregadores } from "./pages/dashboard/Entregadores";
import { MapaPage } from "./pages/dashboard/MapaPage";
import NotFound from "./pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {!session ? (
              <>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
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
      </RealtimeProvider>
    </QueryClientProvider>
  );
};

export default App;
