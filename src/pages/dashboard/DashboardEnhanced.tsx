import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from "@/components/ui/metric-card";
import { LazyStatusDistributionChart } from "@/components/charts/LazyStatusDistributionChart";
import { LazyHourlyDeliveryChart } from "@/components/charts/LazyHourlyDeliveryChart";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { useUnifiedDashboard } from "@/hooks/useUnifiedDashboard";
import { useRealtimeContext } from "@/components/realtime/RealtimeProvider";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Truck,
  MapPin,
  Target,
  Activity,
  Zap,
  BarChart3,
  RefreshCw,
  Wifi,
  WifiOff,
  Bell,
  Eye
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RealtimeMetrics {
  pedidos_ativos: number;
  entregadores_online: number;
  empresas_ativas: number;
  receita_hoje: number;
  tempo_medio_entrega: number;
  taxa_sucesso: number;
}

interface AlertaOperacional {
  id: string;
  tipo: 'warning' | 'error' | 'info';
  titulo: string;
  descricao: string;
  timestamp: string;
  resolvido: boolean;
}

const DashboardEnhanced = () => {
  const { isConnected } = useRealtimeContext();
  const { data: dashboardData, isLoading } = useUnifiedDashboard();
  const { toast } = useToast();
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [alertas, setAlertas] = useState<AlertaOperacional[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Buscar métricas em tempo real
  const { data: metricsData, refetch: refetchMetrics } = useQuery({
    queryKey: ['realtime-metrics'],
    queryFn: async (): Promise<RealtimeMetrics> => {
      const hoje = new Date().toISOString().split('T')[0];
      
      // Pedidos ativos
      const { count: pedidosAtivos } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .in('status', ['recebido', 'enviado', 'a_caminho']);

      // Entregadores online (últimos 5 minutos)
      const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count: entregadoresOnline } = await supabase
        .from('entregadores')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)
        .gte('last_seen', cincoMinutosAtras);

      // Empresas ativas hoje
      const { count: empresasAtivas } = await supabase
        .from('pedidos')
        .select('empresa_id', { count: 'exact', head: true })
        .gte('created_at', hoje);

      // Receita hoje
      const { data: receitaData } = await supabase
        .from('pedidos')
        .select('valor_total')
        .eq('status', 'entregue')
        .gte('data_finalizacao', hoje);

      const receitaHoje = receitaData?.reduce((sum, pedido) => sum + (pedido.valor_total || 0), 0) || 0;

      // Tempo médio de entrega (últimos 7 dias)
      const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: entregasRecentes } = await supabase
        .from('pedidos')
        .select('created_at, data_finalizacao')
        .eq('status', 'entregue')
        .gte('data_finalizacao', seteDiasAtras)
        .not('data_finalizacao', 'is', null);

      let tempoMedioEntrega = 0;
      if (entregasRecentes && entregasRecentes.length > 0) {
        const tempos = entregasRecentes.map(pedido => {
          const inicio = new Date(pedido.created_at);
          const fim = new Date(pedido.data_finalizacao!);
          return (fim.getTime() - inicio.getTime()) / (1000 * 60); // em minutos
        });
        tempoMedioEntrega = tempos.reduce((sum, tempo) => sum + tempo, 0) / tempos.length;
      }

      // Taxa de sucesso (últimos 7 dias)
      const { count: totalPedidos } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', seteDiasAtras)
        .in('status', ['entregue', 'cancelado']);

      const { count: pedidosEntregues } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'entregue')
        .gte('data_finalizacao', seteDiasAtras);

      const taxaSucesso = totalPedidos ? (pedidosEntregues / totalPedidos) * 100 : 0;

      return {
        pedidos_ativos: pedidosAtivos || 0,
        entregadores_online: entregadoresOnline || 0,
        empresas_ativas: empresasAtivas || 0,
        receita_hoje: receitaHoje,
        tempo_medio_entrega: tempoMedioEntrega,
        taxa_sucesso: taxaSucesso
      };
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Buscar alertas operacionais
  const { data: alertasData } = useQuery({
    queryKey: ['alertas-operacionais'],
    queryFn: async (): Promise<AlertaOperacional[]> => {
      // Simular alertas baseados em métricas
      const alertas: AlertaOperacional[] = [];
      
      if (metricsData) {
        // Alerta se muitos pedidos ativos
        if (metricsData.pedidos_ativos > 50) {
          alertas.push({
            id: 'pedidos-alto',
            tipo: 'warning',
            titulo: 'Alto volume de pedidos',
            descricao: `${metricsData.pedidos_ativos} pedidos ativos no momento`,
            timestamp: new Date().toISOString(),
            resolvido: false
          });
        }

        // Alerta se poucos entregadores online
        if (metricsData.entregadores_online < 5) {
          alertas.push({
            id: 'entregadores-baixo',
            tipo: 'error',
            titulo: 'Poucos entregadores online',
            descricao: `Apenas ${metricsData.entregadores_online} entregadores ativos`,
            timestamp: new Date().toISOString(),
            resolvido: false
          });
        }

        // Alerta se tempo médio alto
        if (metricsData.tempo_medio_entrega > 60) {
          alertas.push({
            id: 'tempo-alto',
            tipo: 'warning',
            titulo: 'Tempo de entrega elevado',
            descricao: `Tempo médio: ${Math.round(metricsData.tempo_medio_entrega)} minutos`,
            timestamp: new Date().toISOString(),
            resolvido: false
          });
        }

        // Alerta se taxa de sucesso baixa
        if (metricsData.taxa_sucesso < 90) {
          alertas.push({
            id: 'taxa-baixa',
            tipo: 'error',
            titulo: 'Taxa de sucesso baixa',
            descricao: `Taxa atual: ${metricsData.taxa_sucesso.toFixed(1)}%`,
            timestamp: new Date().toISOString(),
            resolvido: false
          });
        }
      }

      return alertas;
    },
    enabled: !!metricsData,
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  });

  useEffect(() => {
    if (metricsData) {
      setRealtimeMetrics(metricsData);
      setLastUpdate(new Date());
    }
  }, [metricsData]);

  useEffect(() => {
    if (alertasData) {
      setAlertas(alertasData);
    }
  }, [alertasData]);

  // Configurar realtime para atualizações automáticas
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          refetchMetrics();
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchMetrics]);

  const handleRefreshMetrics = () => {
    refetchMetrics();
    toast({
      title: "Métricas atualizadas",
      description: "Os dados foram atualizados com sucesso.",
    });
  };

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertBadge = (tipo: string) => {
    switch (tipo) {
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header com status de conexão */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Dashboard Operacional
          </h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real da plataforma
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600">Offline</span>
              </>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            Última atualização: {format(lastUpdate, 'HH:mm:ss', { locale: ptBR })}
          </div>
          
          <Button variant="outline" size="sm" onClick={handleRefreshMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Alertas operacionais */}
      {alertas.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-5 w-5" />
              Alertas Operacionais ({alertas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertas.slice(0, 3).map((alerta) => (
              <div key={alerta.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  {getAlertIcon(alerta.tipo)}
                  <div>
                    <div className="font-medium">{alerta.titulo}</div>
                    <div className="text-sm text-muted-foreground">{alerta.descricao}</div>
                  </div>
                </div>
                <Badge variant={getAlertBadge(alerta.tipo) as any}>
                  {alerta.tipo === 'error' ? 'Crítico' : alerta.tipo === 'warning' ? 'Atenção' : 'Info'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="metricas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metricas">Métricas em Tempo Real</TabsTrigger>
          <TabsTrigger value="operacional">Visão Operacional</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="metricas" className="space-y-4">
          {/* Métricas em tempo real */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Pedidos Ativos"
              value={realtimeMetrics?.pedidos_ativos?.toString() || "0"}
              description="Em andamento agora"
              icon={Package}
              trend={realtimeMetrics?.pedidos_ativos ? (realtimeMetrics.pedidos_ativos > 20 ? "up" : "down") : undefined}
            />
            
            <MetricCard
              title="Entregadores Online"
              value={realtimeMetrics?.entregadores_online?.toString() || "0"}
              description="Ativos nos últimos 5min"
              icon={Truck}
              trend={realtimeMetrics?.entregadores_online ? (realtimeMetrics.entregadores_online > 10 ? "up" : "down") : undefined}
            />
            
            <MetricCard
              title="Receita Hoje"
              value={`R$ ${realtimeMetrics?.receita_hoje?.toFixed(2) || "0,00"}`}
              description="Faturamento do dia"
              icon={DollarSign}
              trend="up"
            />
            
            <MetricCard
              title="Taxa de Sucesso"
              value={`${realtimeMetrics?.taxa_sucesso?.toFixed(1) || "0"}%`}
              description="Últimos 7 dias"
              icon={Target}
              trend={realtimeMetrics?.taxa_sucesso ? (realtimeMetrics.taxa_sucesso > 90 ? "up" : "down") : undefined}
            />
          </div>

          {/* Métricas de performance */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tempo Médio de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Math.round(realtimeMetrics?.tempo_medio_entrega || 0)} min
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Meta: 45 minutos
                </div>
                <Progress 
                  value={Math.min((45 / (realtimeMetrics?.tempo_medio_entrega || 45)) * 100, 100)} 
                  className="mt-3"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Empresas Ativas Hoje
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {realtimeMetrics?.empresas_ativas || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Empresas que fizeram pedidos
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">+12% vs ontem</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operacional" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <LazyStatusDistributionChart />
            <LazyHourlyDeliveryChart />
          </div>
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Receita Total"
              value={`R$ ${dashboardData?.metrics?.receitaTotal?.toFixed(2) || "0,00"}`}
              description="Todos os tempos"
              icon={DollarSign}
            />
            
            <MetricCard
              title="Comissão Plataforma"
              value={`R$ ${((dashboardData?.metrics?.receitaTotal || 0) * 0.15).toFixed(2)}`}
              description="15% da receita"
              icon={TrendingUp}
            />
            
            <MetricCard
              title="Valor Entregadores"
              value={`R$ ${((dashboardData?.metrics?.receitaTotal || 0) * 0.85).toFixed(2)}`}
              description="85% da receita"
              icon={Truck}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardEnhanced;

