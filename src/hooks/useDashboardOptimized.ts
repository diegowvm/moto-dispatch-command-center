import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// DEPRECADO: Use useUnifiedDashboard para performance otimizada
export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard-metrics-legacy'],
    queryFn: async () => {
      console.warn('DEPRECADO: useDashboardMetrics foi substituído por useUnifiedDashboard');
      return {};
    },
    staleTime: 30 * 60 * 1000, // 30 minutos - evitar uso
    enabled: false, // Desabilitado por padrão
  });
};

// DEPRECADO: Use useUnifiedDashboard.pedidosRecentes
export const usePedidosRecentes = () => {
  return useQuery({
    queryKey: ['pedidos-recentes-legacy'],
    queryFn: async () => {
      console.warn('DEPRECADO: usePedidosRecentes incluído em useUnifiedDashboard');
      return [];
    },
    staleTime: 30 * 60 * 1000,
    enabled: false,
  });
};

// DEPRECADO: Use useUnifiedDashboard.entregasPorHora
export const useEntregasPorHora = () => {
  return useQuery({
    queryKey: ['entregas-por-hora-legacy'],
    queryFn: async () => {
      console.warn('DEPRECADO: useEntregasPorHora incluído em useUnifiedDashboard');
      return [];
    },
    staleTime: 30 * 60 * 1000,
    enabled: false,
  });
};