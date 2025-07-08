import React from 'react';
import { LazyMapWrapper } from '@/components/lazy/LazyMapWrapper';

// Lazy loading do componente pesado DeliveryMap
const DeliveryMap = React.lazy(() => 
  import('./DeliveryMap').then(module => ({ 
    default: module.DeliveryMap 
  }))
);

interface LazyDeliveryMapProps {
  className?: string;
  height?: string;
}

export const LazyDeliveryMap = React.memo<LazyDeliveryMapProps>(({ 
  className,
  height = "500px" 
}) => {
  return (
    <LazyMapWrapper
      title="Mapa de Entregas"
      height={height}
      className={className}
    >
      <DeliveryMap />
    </LazyMapWrapper>
  );
});

LazyDeliveryMap.displayName = 'LazyDeliveryMap';