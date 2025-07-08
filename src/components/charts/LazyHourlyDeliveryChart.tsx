import React from 'react';
import { LazyChartWrapper } from '@/components/lazy/LazyChartWrapper';

// Lazy loading do componente pesado Recharts
const HourlyDeliveryChart = React.lazy(() => 
  import('./HourlyDeliveryChart').then(module => ({ 
    default: module.HourlyDeliveryChart 
  }))
);

interface HourlyData {
  hora: string;
  entregas: number;
}

interface LazyHourlyDeliveryChartProps {
  data: HourlyData[];
  loading?: boolean;
}

export const LazyHourlyDeliveryChart = React.memo<LazyHourlyDeliveryChartProps>(({ 
  data, 
  loading = false 
}) => {
  const totalEntregas = data.reduce((sum, item) => sum + item.entregas, 0);
  const picoHora = data.reduce((max, item) => item.entregas > max.entregas ? item : max, data[0]);
  
  const description = `Total: ${totalEntregas} entregas | Pico: ${picoHora?.hora} (${picoHora?.entregas} entregas)`;
  
  return (
    <LazyChartWrapper
      title="Entregas por Hora - Hoje"
      description={description}
      height="300px"
    >
      <HourlyDeliveryChart data={data} loading={loading} />
    </LazyChartWrapper>
  );
});

LazyHourlyDeliveryChart.displayName = 'LazyHourlyDeliveryChart';