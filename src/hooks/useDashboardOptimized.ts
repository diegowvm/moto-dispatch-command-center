import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Executa todas as queries em paralelo para melhor performance
      const [
        totalHojeResult,
        entreguesHojeResult, 
        pendentesResult,
        emAndamentoResult,
        receitaResult,
        entregadoresResult,
        statusDistributionResult
      ] = await Promise.all([
        // Total pedidos hoje
        supabase
          .from('pedidos')
          .select('*', { count: 'exact' })
          .gte('created_at', `${today}T00:00:00.000Z`),
        
        // Entregues hoje
        supabase
          .from('pedidos')
          .select('*', { count: 'exact' })
          .eq('status', 'entregue')
          .gte('data_finalizacao', `${today}T00:00:00.000Z`),
        
        // Pendentes (recebido)
        supabase
          .from('pedidos')
          .select('*', { count: 'exact' })
          .eq('status', 'recebido'),
        
        // Em andamento (em_coleta + em_entrega)
        supabase
          .from('pedidos')
          .select('*', { count: 'exact' })
          .in('status', ['enviado', 'a_caminho']),
        
        // Receita hoje
        supabase
          .from('pedidos')
          .select('valor_total')
          .eq('status', 'entregue')
          .gte('data_finalizacao', `${today}T00:00:00.000Z`),
        
        // Status dos entregadores
        supabase
          .from('entregadores')
          .select('status')
          .eq('usuarios.status', true),
        
        // Distribuição por status (últimos 7 dias)
        supabase
          .from('pedidos')
          .select('status')
          .gte('created_at', sevenDaysAgo.toISOString())
      ]);

      // Processa receita
      const receitaHoje = receitaResult.data?.reduce((sum, pedido) => 
        sum + (pedido.valor_total || 0), 0) || 0;

      // Processa status dos entregadores
      const entregadoresStatus = entregadoresResult.data?.reduce((acc, ent) => {
        acc[ent.status] = (acc[ent.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const entregadoresDisponiveis = (entregadoresStatus.disponivel || 0) + (entregadoresStatus.offline || 0);
      const entregadoresOcupados = (entregadoresStatus.ocupado || 0) + (entregadoresStatus.em_entrega || 0);

      // Processa distribuição de status
      const statusDistribution = statusDistributionResult.data?.reduce((acc, pedido) => {
        acc[pedido.status] = (acc[pedido.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalHoje: totalHojeResult.count || 0,
        entreguesHoje: entreguesHojeResult.count || 0,
        pendentes: pendentesResult.count || 0,
        emAndamento: emAndamentoResult.count || 0,
        receitaHoje,
        entregadoresDisponiveis,
        entregadoresOcupados,
        totalEntregadores: entregadoresDisponiveis + entregadoresOcupados,
        statusDistribution: [
          { name: 'Recebido', value: statusDistribution.recebido || 0, color: 'hsl(var(--warning))' },
          { name: 'Enviado', value: statusDistribution.enviado || 0, color: 'hsl(var(--primary))' },
          { name: 'A Caminho', value: statusDistribution.a_caminho || 0, color: 'hsl(var(--accent))' },
          { name: 'Entregue', value: statusDistribution.entregue || 0, color: 'hsl(var(--success))' },
          { name: 'Cancelado', value: statusDistribution.cancelado || 0, color: 'hsl(var(--destructive))' }
        ].filter(item => item.value > 0)
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 60000, // 1 minuto (reduzido de 30s)
  });
};

export const usePedidosRecentes = () => {
  return useQuery({
    queryKey: ['pedidos-recentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          status,
          valor_total,
          created_at,
          empresas!inner(nome_fantasia),
          entregadores(
            id,
            usuarios!inner(nome)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 30000, // 30 segundos
  });
};

export const useEntregasPorHora = () => {
  return useQuery({
    queryKey: ['entregas-por-hora'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('pedidos')
        .select('data_finalizacao')
        .eq('status', 'entregue')
        .gte('data_finalizacao', `${today}T00:00:00.000Z`)
        .not('data_finalizacao', 'is', null);
      
      if (error) throw error;
      
      // Agrupa por hora
      const hoursData = new Array(24).fill(0).map((_, index) => ({
        hora: `${index.toString().padStart(2, '0')}:00`,
        entregas: 0
      }));
      
      data?.forEach(pedido => {
        if (pedido.data_finalizacao) {
          const hour = new Date(pedido.data_finalizacao).getHours();
          hoursData[hour].entregas++;
        }
      });
      
      return hoursData;
    },
    staleTime: 15 * 60 * 1000, // 15 minutos
    refetchInterval: 5 * 60 * 1000, // 5 minutos
  });
};