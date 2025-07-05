import { PieChart, Pie, ResponsiveContainer, Cell, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface StatusDistributionChartProps {
  data: StatusData[];
  loading?: boolean;
}

export const StatusDistributionChart = ({ data, loading = false }: StatusDistributionChartProps) => {
  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Distribuição de Pedidos por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse">
              <div className="h-32 w-32 bg-muted rounded-full mx-auto mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded mx-auto"></div>
                <div className="h-3 w-32 bg-muted rounded mx-auto"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPedidos = data.reduce((sum, item) => sum + item.value, 0);

  if (totalPedidos === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Distribuição de Pedidos por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Nenhum dado disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Distribuição de Pedidos por Status</CardTitle>
        <p className="text-sm text-muted-foreground">Últimos 7 dias - Total: {totalPedidos} pedidos</p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: number) => [`${value} pedidos`, 'Quantidade']}
              />
              <Legend 
                wrapperStyle={{ color: 'hsl(var(--foreground))' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};