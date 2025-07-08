import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// TTL Strategy por tipo de dado
const TTL_ESTRATEGY = {
  CRITICAL: 2 * 60 * 1000,    // 2 minutos - métricas críticas
  REALTIME: 30 * 1000,        // 30 segundos - localização, entregadores
  STATIC: 30 * 60 * 1000,     // 30 minutos - empresas, configurações
  HISTORICAL: 60 * 60 * 1000, // 1 hora - histórico, relatórios
} as const;

// Query única consolidada para dashboard
export const useUnifiedDashboard = () => {
  return useQuery({
    queryKey: ['unified-dashboard'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Single mega-query com todas as métricas necessárias
      const [
        // Métricas de pedidos (consolidadas)
        pedidosHojeResult,
        entreguesHojeResult,
        pendentesResult,
        emAndamentoResult,
        receitaResult,
        
        // Entregadores status
        entregadoresResult,
        entregadoresDisponiveisResult,
        
        // Distribuição e histórico
        statusDistributionResult,
        pedidosRecentesResult,
        entregasPorHoraResult,
        
        // Localização tempo real
        localizacaoResult
      ] = await Promise.all([
        // 1. Total pedidos hoje
        supabase
          .from('pedidos')
          .select('*', { count: 'exact' })
          .gte('created_at', `${today}T00:00:00.000Z`),
        
        // 2. Entregues hoje
        supabase
          .from('pedidos')
          .select('*', { count: 'exact' })
          .eq('status', 'entregue')
          .gte('data_finalizacao', `${today}T00:00:00.000Z`),
        
        // 3. Pendentes
        supabase
          .from('pedidos')
          .select('*', { count: 'exact' })
          .eq('status', 'recebido'),
        
        // 4. Em andamento
        supabase
          .from('pedidos')
          .select('*', { count: 'exact' })
          .in('status', ['enviado', 'a_caminho']),
        
        // 5. Receita hoje
        supabase
          .from('pedidos')
          .select('valor_total')
          .eq('status', 'entregue')
          .gte('data_finalizacao', `${today}T00:00:00.000Z`),
        
        // 6. Status dos entregadores
        supabase
          .from('entregadores')
          .select(`
            status,
            usuarios!inner(nome, email, telefone)
          `),
        
        // 7. Entregadores disponíveis
        supabase
          .from('entregadores')
          .select(`
            *,
            usuarios!inner(id, nome, email, telefone)
          `)
          .eq('status', 'disponivel')
          .order('avaliacao_media', { ascending: false }),
        
        // 8. Distribuição por status (últimos 7 dias)
        supabase
          .from('pedidos')
          .select('status')
          .gte('created_at', sevenDaysAgo.toISOString()),
        
        // 9. Pedidos recentes
        supabase
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
          .limit(4),
        
        // 10. Entregas por hora (hoje)
        supabase
          .from('pedidos')
          .select('data_finalizacao')
          .eq('status', 'entregue')
          .gte('data_finalizacao', `${today}T00:00:00.000Z`)
          .not('data_finalizacao', 'is', null),
        
        // 11. Localização tempo real
        supabase
          .from('localizacao_tempo_real')
          .select(`
            *,
            entregadores!inner(
              id,
              usuarios!inner(nome)
            )
          `)
          .order('timestamp', { ascending: false })
      ]);

      // Processamento consolidado
      const receita = receitaResult.data?.reduce((sum, pedido) => 
        sum + (pedido.valor_total || 0), 0) || 0;

      const entregadoresStatus = entregadoresResult.data?.reduce((acc, ent) => {
        acc[ent.status] = (acc[ent.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const disponiveis = (entregadoresStatus.disponivel || 0) + (entregadoresStatus.offline || 0);
      const ocupados = (entregadoresStatus.ocupado || 0) + (entregadoresStatus.em_entrega || 0);

      const statusDistribution = statusDistributionResult.data?.reduce((acc, pedido) => {
        acc[pedido.status] = (acc[pedido.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Processo entregas por hora
      const hoursData = new Array(24).fill(0).map((_, index) => ({
        hora: `${index.toString().padStart(2, '0')}:00`,
        entregas: 0
      }));
      
      entregasPorHoraResult.data?.forEach(pedido => {
        if (pedido.data_finalizacao) {
          const hour = new Date(pedido.data_finalizacao).getHours();
          hoursData[hour].entregas++;
        }
      });

      return {
        // Métricas principais
        metrics: {
          totalHoje: pedidosHojeResult.count || 0,
          entreguesHoje: entreguesHojeResult.count || 0,
          pendentes: pendentesResult.count || 0,
          emAndamento: emAndamentoResult.count || 0,
          receitaHoje: receita,
          entregadoresDisponiveis: disponiveis,
          entregadoresOcupados: ocupados,
          totalEntregadores: disponiveis + ocupados,
        },
        
        // Distribuição para gráficos
        statusDistribution: [
          { name: 'Recebido', value: statusDistribution.recebido || 0, color: 'hsl(var(--warning))' },
          { name: 'Enviado', value: statusDistribution.enviado || 0, color: 'hsl(var(--primary))' },
          { name: 'A Caminho', value: statusDistribution.a_caminho || 0, color: 'hsl(var(--accent))' },
          { name: 'Entregue', value: statusDistribution.entregue || 0, color: 'hsl(var(--success))' },
          { name: 'Cancelado', value: statusDistribution.cancelado || 0, color: 'hsl(var(--destructive))' }
        ].filter(item => item.value > 0),
        
        // Dados para componentes
        pedidosRecentes: pedidosRecentesResult.data || [],
        entregasPorHora: hoursData,
        entregadoresDisponiveis: entregadoresDisponiveisResult.data || [],
        localizacaoTempoReal: localizacaoResult.data || []
      };
    },
    staleTime: TTL_ESTRATEGY.CRITICAL,
    // Remover refetchInterval - usar realtime ao invés de polling
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
};

// Hook otimizado para dados específicos com TTL apropriado
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
    },
    staleTime: TTL_ESTRATEGY.REALTIME,
    // Sem refetchInterval - usar realtime
  });
};

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
    staleTime: TTL_ESTRATEGY.STATIC, // 30 minutos - dados raramente mudam
  });
};

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
    },
    staleTime: TTL_ESTRATEGY.CRITICAL,
    // Sem refetchInterval - usar realtime
  });
};

// Hook específico para localização com TTL de tempo real
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
    staleTime: TTL_ESTRATEGY.REALTIME, // 30 segundos - dados críticos de localização
    // Sem refetchInterval - usar realtime
  });
};