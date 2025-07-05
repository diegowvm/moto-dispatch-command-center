import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HourlyData {
  hora: string;
  entregas: number;
}

interface HourlyDeliveryChartProps {
  data: HourlyData[];
  loading?: boolean;
}

export const HourlyDeliveryChart = ({ data, loading = false }: HourlyDeliveryChartProps) => {
  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Entregas por Hora - Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse w-full">
              <div className="h-4 w-48 bg-muted rounded mb-8 mx-auto"></div>
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-end space-x-2">
                    <div className="h-2 w-full bg-muted rounded"></div>
                    <div className={`h-${Math.floor(Math.random() * 20) + 4} w-full bg-muted rounded`}></div>
                    <div className="h-6 w-full bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalEntregas = data.reduce((sum, item) => sum + item.entregas, 0);
  const picoHora = data.reduce((max, item) => item.entregas > max.entregas ? item : max, data[0]);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Entregas por Hora - Hoje</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total: {totalEntregas} entregas | Pico: {picoHora?.hora} ({picoHora?.entregas} entregas)
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
              />
              <XAxis 
                dataKey="hora" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: number) => [`${value} entregas`, 'Quantidade']}
                labelFormatter={(label) => `Horário: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="entregas" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};