import React from 'react';
import { LazyMapWrapper } from '@/components/lazy/LazyMapWrapper';

// Lazy loading do componente pesado OptimizedDeliveryTrackingMap
const OptimizedDeliveryTrackingMap = React.lazy(() => 
  import('./OptimizedDeliveryTrackingMap').then(module => ({ 
    default: module.OptimizedDeliveryTrackingMap 
  }))
);

interface LazyDeliveryTrackingMapProps {
  className?: string;
  height?: string;
  maxEntregadores?: number;
}

export const LazyDeliveryTrackingMap = React.memo<LazyDeliveryTrackingMapProps>(({ 
  className,
  height = "500px",
  maxEntregadores = 100
}) => {
  return (
    <LazyMapWrapper
      title="Rastreamento de Entregas"
      height={height}
      className={className}
    >
      <OptimizedDeliveryTrackingMap 
        className={className} 
        height={height}
        maxEntregadores={maxEntregadores}
      />
    </LazyMapWrapper>
  );
});

LazyDeliveryTrackingMap.displayName = 'LazyDeliveryTrackingMap';