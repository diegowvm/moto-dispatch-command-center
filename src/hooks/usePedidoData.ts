import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Pedido = Tables<'pedidos'>;

// Hook para buscar pedido por ID com todos os relacionamentos
export const usePedidoById = (id: string) => {
  return useQuery({
    queryKey: ['pedido', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          empresas!inner(id, nome_fantasia, razao_social),
          entregadores(
            id,
            usuarios!inner(id, nome, telefone)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
};

// Hook para buscar logs de um pedido
export const usePedidoLogs = (pedidoId: string) => {
  return useQuery({
    queryKey: ['pedido-logs', pedidoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logs_sistema')
        .select('*')
        .eq('pedido_id', pedidoId)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!pedidoId
  });
};

// Hook para atribuir entregador
export const useAtribuirEntregador = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      pedidoId, 
      entregadorId 
    }: { 
      pedidoId: string; 
      entregadorId: string; 
    }) => {
      const { data, error } = await supabase
        .from('pedidos')
        .update({
          entregador_id: entregadorId,
          data_atribuicao: new Date().toISOString(),
          status: 'enviado'
        })
        .eq('id', pedidoId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pedido', variables.pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-metrics'] });
      
      toast({
        title: 'Entregador atribuído',
        description: 'O entregador foi atribuído ao pedido com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atribuir entregador',
        description: 'Ocorreu um erro ao tentar atribuir o entregador.',
        variant: 'destructive',
      });
    }
  });
};

// Hook para cancelar pedido
export const useCancelarPedido = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      pedidoId, 
      motivo 
    }: { 
      pedidoId: string; 
      motivo: string; 
    }) => {
      const { data, error } = await supabase
        .from('pedidos')
        .update({
          status: 'cancelado',
          data_finalizacao: new Date().toISOString(),
          observacoes: motivo
        })
        .eq('id', pedidoId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pedido', variables.pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-metrics'] });
      
      toast({
        title: 'Pedido cancelado',
        description: 'O pedido foi cancelado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao cancelar pedido',
        description: 'Ocorreu um erro ao tentar cancelar o pedido.',
        variant: 'destructive',
      });
    }
  });
};