import React from 'react';
import { LazyMapWrapper } from '@/components/lazy/LazyMapWrapper';

// Lazy loading do componente pesado DeliveryTrackingMap
const DeliveryTrackingMap = React.lazy(() => 
  import('./DeliveryTrackingMap').then(module => ({ 
    default: module.DeliveryTrackingMap 
  }))
);

interface LazyDeliveryTrackingMapProps {
  className?: string;
  height?: string;
}

export const LazyDeliveryTrackingMap = React.memo<LazyDeliveryTrackingMapProps>(({ 
  className,
  height = "500px" 
}) => {
  return (
    <LazyMapWrapper
      title="Rastreamento de Entregas"
      height={height}
      className={className}
    >
      <DeliveryTrackingMap className={className} height={height} />
    </LazyMapWrapper>
  );
});

LazyDeliveryTrackingMap.displayName = 'LazyDeliveryTrackingMap';