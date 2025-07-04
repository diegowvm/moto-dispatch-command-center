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
export const usePedidos = (filters?: { status?: string; empresa_id?: string }) => {
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
        query = query.eq('status', filters.status);
      }
      
      if (filters?.empresa_id) {
        query = query.eq('empresa_id', filters.empresa_id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });
};

export const usePedidosMetrics = () => {
  return useQuery({
    queryKey: ['pedidos-metrics'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Total de pedidos hoje
      const { count: totalHoje } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact' })
        .gte('created_at', `${today}T00:00:00.000Z`);

      // Pedidos entregues hoje
      const { count: entreguesHoje } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact' })
        .eq('status', 'entregue')
        .gte('data_finalizacao', `${today}T00:00:00.000Z`);

      // Pedidos pendentes
      const { count: pendentes } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact' })
        .eq('status', 'recebido');

      // Pedidos em trânsito
      const { count: emTransito } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact' })
        .in('status', ['enviado', 'a_caminho']);

      // Receita hoje
      const { data: receitaData } = await supabase
        .from('pedidos')
        .select('valor_total')
        .eq('status', 'entregue')
        .gte('data_finalizacao', `${today}T00:00:00.000Z`);

      const receitaHoje = receitaData?.reduce((sum, pedido) => 
        sum + (pedido.valor_total || 0), 0) || 0;

      return {
        totalHoje: totalHoje || 0,
        entreguesHoje: entreguesHoje || 0,
        pendentes: pendentes || 0,
        emTransito: emTransito || 0,
        receitaHoje
      };
    },
    refetchInterval: 30000 // Atualiza a cada 30 segundos
  });
};

// Localização em tempo real
export const useLocalizacaoTempoReal = () => {
  return useQuery({
    queryKey: ['localizacao-tempo-real'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('localizacao_tempo_real')
        .select(`
          *,
          entregadores!inner(
            id,
            usuarios!inner(nome)
          )
        `)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000 // Atualiza a cada 10 segundos
  });
};

// Empresas
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
    }
  });
};

// Mutations
export const useUpdateEntregadorStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('entregadores')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
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
      const updateData: any = { status };
      
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
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-metrics'] });
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
          status,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['localizacao-tempo-real'] });
    }
  });
};