import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePedidosMetrics, usePedidos } from "@/hooks/useSupabaseData";
import { useRealtimeContext } from "@/components/realtime/RealtimeProvider";
import { 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Truck
} from "lucide-react";

const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  description 
}: {
  title: string;
  value: string;
  icon: any;
  trend?: "up" | "down";
  trendValue?: string;
  description?: string;
}) => (
  <Card className="bg-card border-border">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-primary" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {trendValue && (
        <div className={`text-xs flex items-center mt-1 ${
          trend === "up" ? "text-success" : "text-destructive"
        }`}>
          <TrendingUp className="h-3 w-3 mr-1" />
          {trendValue}
        </div>
      )}
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

export const Dashboard = () => {
  const { isConnected } = useRealtimeContext();
  const { data: metrics, isLoading: metricsLoading } = usePedidosMetrics();
  const { data: pedidos, isLoading: pedidosLoading } = usePedidos();

  // Pegar os 4 pedidos mais recentes
  const recentOrders = pedidos?.slice(0, 4).map(pedido => ({
    id: pedido.numero_pedido,
    empresa: pedido.empresas?.nome_fantasia || 'Empresa',
    entregador: pedido.entregadores?.usuarios?.nome || 'Não atribuído',
    status: pedido.status,
    valor: pedido.valor_total ? `R$ ${pedido.valor_total.toFixed(2)}` : 'R$ 0,00',
    tempo: new Date(pedido.created_at).toLocaleString('pt-BR')
  })) || [
    // Fallback data
    {
      id: "#1234",
      empresa: "TechCorp Ltd",
      entregador: "João Silva",
      status: "em_transito",
      valor: "R$ 45,90",
      tempo: "há 15 min"
    },
    {
      id: "#1235",
      empresa: "FastFood Inc",
      entregador: "Maria Santos",
      status: "entregue",
      valor: "R$ 32,50",
      tempo: "há 25 min"
    },
    {
      id: "#1236",
      empresa: "Farmácia Plus",
      entregador: "Pedro Costa",
      status: "coletando",
      valor: "R$ 67,80",
      tempo: "há 30 min"
    },
    {
      id: "#1237",
      empresa: "Supermercado XYZ",
      entregador: "Ana Oliveira",
      status: "pendente",
      valor: "R$ 123,45",
      tempo: "há 45 min"
    }
  ];

  if (metricsLoading || pedidosLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const configs = {
      pendente: { label: "Pendente", variant: "secondary" as const },
      coletando: { label: "Coletando", variant: "default" as const },
      em_transito: { label: "Em Trânsito", variant: "default" as const },
      entregue: { label: "Entregue", variant: "default" as const }
    };
    
    const config = configs[status as keyof typeof configs] || configs.pendente;
    return (
      <Badge variant={config.variant} className={
        status === 'entregue' ? 'bg-success hover:bg-success' :
        status === 'em_transito' ? 'bg-primary hover:bg-primary' :
        status === 'coletando' ? 'bg-warning hover:bg-warning text-warning-foreground' :
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Entregadores Online"
          value="24"
          icon={Users}
          trend="up"
          trendValue="+12% hoje"
          description="6 disponíveis, 18 em entrega"
        />
        <MetricCard
          title="Pedidos Hoje"
          value={metrics?.totalHoje.toString() || "0"}
          icon={Package}
          trend="up"
          trendValue="+8% vs ontem"
          description={`${metrics?.entreguesHoje || 0} entregues, ${metrics?.pendentes || 0} pendentes`}
        />
        <MetricCard
          title="Receita Hoje"
          value={`R$ ${(metrics?.receitaHoje || 0).toFixed(2)}`}
          icon={DollarSign}
          trend="up"
          trendValue="+15% vs ontem"
          description="Taxa média calculada"
        />
        <MetricCard
          title="Em Trânsito"
          value={metrics?.emTransito.toString() || "0"}
          icon={Clock}
          trend="up"
          trendValue="Atualizando..."
          description="Pedidos em movimento"
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
                <span className="text-sm text-muted-foreground">Em Trânsito</span>
              </div>
              <span className="font-medium text-foreground">{metrics?.emTransito || 0}</span>
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