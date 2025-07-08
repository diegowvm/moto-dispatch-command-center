import React from 'react';
import { LazyMapWrapper } from '@/components/lazy/LazyMapWrapper';

// Lazy loading do componente pesado PedidoMap
const PedidoMap = React.lazy(() => 
  import('./PedidoMap').then(module => ({ 
    default: module.PedidoMap 
  }))
);

interface LazyPedidoMapProps {
  enderecoColeta: string;
  enderecoEntrega: string;
  cidadeColeta: string;
  cidadeEntrega: string;
  className?: string;
}

export const LazyPedidoMap = React.memo<LazyPedidoMapProps>(({ 
  enderecoColeta,
  enderecoEntrega,
  cidadeColeta,
  cidadeEntrega,
  className 
}) => {
  return (
    <LazyMapWrapper
      title="Mapa do Pedido"
      height="400px"
      className={className}
    >
      <PedidoMap
        enderecoColeta={enderecoColeta}
        enderecoEntrega={enderecoEntrega}
        cidadeColeta={cidadeColeta}
        cidadeEntrega={cidadeEntrega}
        className={className}
      />
    </LazyMapWrapper>
  );
});

LazyPedidoMap.displayName = 'LazyPedidoMap';