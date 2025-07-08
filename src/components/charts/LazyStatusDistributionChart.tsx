import React from 'react';
import { LazyChartWrapper } from '@/components/lazy/LazyChartWrapper';

// Lazy loading do componente pesado Recharts
const StatusDistributionChart = React.lazy(() => 
  import('./StatusDistributionChart').then(module => ({ 
    default: module.StatusDistributionChart 
  }))
);

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface LazyStatusDistributionChartProps {
  data: StatusData[];
  loading?: boolean;
}

export const LazyStatusDistributionChart = React.memo<LazyStatusDistributionChartProps>(({ 
  data, 
  loading = false 
}) => {
  const totalPedidos = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <LazyChartWrapper
      title="Distribuição de Pedidos por Status"
      description={`Últimos 7 dias - Total: ${totalPedidos} pedidos`}
      height="300px"
    >
      <StatusDistributionChart data={data} loading={loading} />
    </LazyChartWrapper>
  );
});

LazyStatusDistributionChart.displayName = 'LazyStatusDistributionChart';