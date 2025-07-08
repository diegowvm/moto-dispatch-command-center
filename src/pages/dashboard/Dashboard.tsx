import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricCard } from "@/components/ui/metric-card";
import { LazyStatusDistributionChart } from "@/components/charts/LazyStatusDistributionChart";
import { LazyHourlyDeliveryChart } from "@/components/charts/LazyHourlyDeliveryChart";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { useUnifiedDashboard } from "@/hooks/useUnifiedDashboard";
import { useRealtimeContext } from "@/components/realtime/RealtimeProvider";
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
  Target
} from "lucide-react";


const Dashboard = () => {
  const { isConnected } = useRealtimeContext();
  const { data: dashboardData, isLoading } = useUnifiedDashboard();

  // Processar dados unificados
  const metrics = dashboardData?.metrics;
  const recentOrders = dashboardData?.pedidosRecentes?.map(pedido => ({
    id: pedido.numero_pedido,
    empresa: pedido.empresas?.nome_fantasia || 'Empresa',
    entregador: pedido.entregadores?.usuarios?.nome || 'Não atribuído',
    status: pedido.status,
    valor: pedido.valor_total ? `R$ ${pedido.valor_total.toFixed(2)}` : 'R$ 0,00',
    tempo: new Date(pedido.created_at).toLocaleString('pt-BR')
  })) || [];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const getStatusBadge = (status: string) => {
    const configs = {
      recebido: { label: "Recebido", variant: "secondary" as const },
      enviado: { label: "Enviado", variant: "default" as const },
      a_caminho: { label: "A Caminho", variant: "default" as const },
      entregue: { label: "Entregue", variant: "default" as const },
      cancelado: { label: "Cancelado", variant: "destructive" as const }
    };
    
    const config = configs[status as keyof typeof configs] || configs.recebido;
    return (
      <Badge variant={config.variant} className={
        status === 'entregue' ? 'bg-success hover:bg-success' :
        status === 'a_caminho' ? 'bg-primary hover:bg-primary' :
        status === 'enviado' ? 'bg-accent hover:bg-accent' :
        status === 'cancelado' ? 'bg-destructive hover:bg-destructive' :
        'bg-secondary hover:bg-secondary'
      }>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral das operações de entrega em tempo real
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}></div>
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Entregadores Disponíveis"
          value={metrics?.entregadoresDisponiveis || 0}
          icon={Users}
          trend="neutral"
          description={`${metrics?.entregadoresOcupados || 0} ocupados de ${metrics?.totalEntregadores || 0} total`}
        />
        <MetricCard
          title="Pedidos Hoje"
          value={metrics?.totalHoje || 0}
          icon={Package}
          trend="up"
          trendValue="+8% vs ontem"
          description={`${metrics?.entreguesHoje || 0} entregues`}
        />
        <MetricCard
          title="Em Andamento"
          value={metrics?.emAndamento || 0}
          icon={Truck}
          trend="neutral"
          description="Enviados e a caminho"
        />
        <MetricCard
          title="Pendentes"
          value={metrics?.pendentes || 0}
          icon={Clock}
          trend="down"
          description="Aguardando coleta"
        />
        <MetricCard
          title="Faturamento Hoje"
          value={`R$ ${(metrics?.receitaHoje || 0).toFixed(2)}`}
          icon={DollarSign}
          trend="up"
          trendValue="+15% vs ontem"
          description="Pedidos entregues"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <LazyStatusDistributionChart 
          data={dashboardData?.statusDistribution || []} 
          loading={isLoading}
        />
        <LazyHourlyDeliveryChart 
          data={dashboardData?.entregasPorHora || []} 
          loading={isLoading}
        />
      </div>

      {/* Activity Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Performance */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Performance Hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entregas no Prazo</span>
                <span className="text-foreground font-medium">92%</span>
              </div>
              <Progress value={92} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Satisfação Cliente</span>
                <span className="text-foreground font-medium">4.8/5</span>
              </div>
              <Progress value={96} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de Sucesso</span>
                <span className="text-foreground font-medium">98%</span>
              </div>
              <Progress value={98} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Status Rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">Entregues</span>
              </div>
              <span className="font-medium text-foreground">134</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Em Andamento</span>
              </div>
              <span className="font-medium text-foreground">{metrics?.emAndamento || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm text-muted-foreground">Pendentes</span>
              </div>
              <span className="font-medium text-foreground">{metrics?.pendentes || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Problemas</span>
              </div>
              <span className="font-medium text-foreground">0</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm">
                <p className="text-foreground font-medium">João Silva conectou</p>
                <p className="text-muted-foreground text-xs">há 2 minutos</p>
              </div>
              <div className="text-sm">
                <p className="text-foreground font-medium">Pedido #1234 entregue</p>
                <p className="text-muted-foreground text-xs">há 8 minutos</p>
              </div>
              <div className="text-sm">
                <p className="text-foreground font-medium">Nova empresa cadastrada</p>
                <p className="text-muted-foreground text-xs">há 15 minutos</p>
              </div>
              <div className="text-sm">
                <p className="text-foreground font-medium">Meta diária atingida</p>
                <p className="text-muted-foreground text-xs">há 1 hora</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50">
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="font-medium text-foreground">{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.empresa}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm text-foreground">{order.entregador}</p>
                    <p className="text-xs text-muted-foreground">Entregador</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(order.status)}
                  <div className="text-right">
                    <p className="font-medium text-foreground">{order.valor}</p>
                    <p className="text-xs text-muted-foreground">{order.tempo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;