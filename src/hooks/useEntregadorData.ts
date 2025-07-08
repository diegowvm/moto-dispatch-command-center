import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hook para buscar entregadores disponíveis
// DEPRECADO: Use useUnifiedDashboard.entregadoresDisponiveis
export const useEntregadoresDisponiveis = () => {
  return useQuery({
    queryKey: ['entregadores-disponiveis-legacy'],
    queryFn: async () => {
      console.warn('DEPRECADO: useEntregadoresDisponiveis incluído em useUnifiedDashboard');
      return [];
    },
    staleTime: 30 * 60 * 1000,
    enabled: false,
  });
};