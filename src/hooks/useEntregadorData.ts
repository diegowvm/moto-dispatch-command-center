import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hook para buscar entregadores disponíveis
export const useEntregadoresDisponiveis = () => {
  return useQuery({
    queryKey: ['entregadores-disponiveis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entregadores')
        .select(`
          *,
          usuarios!inner(id, nome, email, telefone)
        `)
        .eq('status', 'disponivel')
        .order('avaliacao_media', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000 // Atualiza a cada 30 segundos
  });
};