import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

// Types
type Entregador = Tables<'entregadores'>;
type Pedido = Tables<'pedidos'>;
type Empresa = Tables<'empresas'>;
type Usuario = Tables<'usuarios'>;
type LocalizacaoTempoReal = Tables<'localizacao_tempo_real'>;

// Entregadores
export const useEntregadores = () => {
  return useQuery({
    queryKey: ['entregadores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entregadores')
        .select(`
          *,
          usuarios!inner(nome, email, telefone)
        `);
      
      if (error) throw error;
      return data;
    }
  });
};

export const useEntregadorById = (id: string) => {
  return useQuery({
    queryKey: ['entregador', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entregadores')
        .select(`
          *,
          usuarios!inner(nome, email, telefone)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
};

// Pedidos
export const usePedidos = (filters?: { status?: string; empresa_id?: string; search?: string }) => {
  return useQuery({
    queryKey: ['pedidos', filters],
    queryFn: async () => {
      let query = supabase
        .from('pedidos')
        .select(`
          *,
          empresas!inner(nome_fantasia),
          entregadores(
            id,
            usuarios!inner(nome)
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status as any);
      }
      
      if (filters?.empresa_id) {
        query = query.eq('empresa_id', filters.empresa_id);
      }

      if (filters?.search) {
        query = query.or(`numero_pedido.ilike.%${filters.search}%,descricao_produto.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });
};

// DEPRECADO: Use useUnifiedDashboard.metrics para performance otimizada
export const usePedidosMetrics = () => {
  return useQuery({
    queryKey: ['pedidos-metrics-legacy'],
    queryFn: async () => {
      console.warn('DEPRECADO: usePedidosMetrics substituído por useUnifiedDashboard');
      return {
        totalHoje: 0,
        entreguesHoje: 0,
        pendentes: 0,
        emTransito: 0,
        receitaHoje: 0
      };
    },
    staleTime: 30 * 60 * 1000,
    enabled: false,
  });
};

// Localização em tempo real
// DEPRECADO: Use useUnifiedDashboard.localizacaoTempoReal ou useLocalizacaoTempoReal do useUnifiedDashboard
export const useLocalizacaoTempoReal = () => {
  return useQuery({
    queryKey: ['localizacao-tempo-real-legacy'],
    queryFn: async () => {
      console.warn('DEPRECADO: useLocalizacaoTempoReal incluído em useUnifiedDashboard');
      return [];
    },
    staleTime: 30 * 60 * 1000,
    enabled: false,
  });
};

// Empresas
// Empresas otimizadas - movidas para useUnifiedDashboard
export const useEmpresas = () => {
  return useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('status', true);
      
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 60 * 1000, // TTL de 30 minutos - dados estáticos
  });
};

// Mutations
export const useUpdateEntregadorStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('entregadores')
        .update({ status: status as any })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
    }
  });
};

export const useUpdatePedidoStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, entregador_id }: { 
      id: string; 
      status: string; 
      entregador_id?: string 
    }) => {
      const updateData: any = { status: status as any };
      
      if (entregador_id) {
        updateData.entregador_id = entregador_id;
        updateData.data_atribuicao = new Date().toISOString();
      }
      
      if (status === 'entregue') {
        updateData.data_finalizacao = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('pedidos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    }
  });
};

export const useUpdateLocalizacao = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      entregador_id, 
      latitude, 
      longitude, 
      status 
    }: { 
      entregador_id: string;
      latitude: number;
      longitude: number;
      status: string;
    }) => {
      const { data, error } = await supabase
        .from('localizacao_tempo_real')
        .upsert({
          entregador_id,
          latitude,
          longitude,
          status: status as any,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['localizacao-tempo-real'] });
    }
  });
};