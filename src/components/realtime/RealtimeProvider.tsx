import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { useNotifications } from '@/hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';

interface RealtimeContextType {
  isConnected: boolean;
  connectionStatus: string;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  connectionStatus: 'disconnected'
});

export const useRealtimeContext = () => useContext(RealtimeContext);

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const queryClient = useQueryClient();
  const {
    isConnected,
    subscribeToOrderUpdates,
    subscribeToDeliveryUpdates,
    subscribeToLocationUpdates
  } = useRealtime();

  const { setUserTags } = useNotifications();
  const invalidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected]);

  // Debounced invalidation para evitar muitas atualizações
  const debouncedInvalidateQueries = useCallback((queryKeys: string[]) => {
    if (invalidationTimeoutRef.current) {
      clearTimeout(invalidationTimeoutRef.current);
    }
    
    invalidationTimeoutRef.current = setTimeout(() => {
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    }, 1000); // Debounce de 1 segundo
  }, [queryClient]);

  useEffect(() => {
    // Subscrever a atualizações de pedidos
    const orderChannel = subscribeToOrderUpdates((payload) => {
      console.log('Atualização de pedido:', payload);
      
      // Invalidar queries relacionadas a pedidos (debounced) - usando novo sistema unificado
      debouncedInvalidateQueries(['unified-dashboard', 'pedidos']);
    });

    // Subscrever a atualizações de entregadores
    const deliveryChannel = subscribeToDeliveryUpdates((payload) => {
      console.log('Atualização de entregador:', payload);
      
      // Invalidar queries relacionadas a entregadores (debounced) - usando novo sistema unificado
      debouncedInvalidateQueries(['unified-dashboard', 'entregadores']);
    });

    // Subscrever a atualizações de localização
    const locationChannel = subscribeToLocationUpdates((payload) => {
      console.log('Atualização de localização:', payload);
      
      // Invalidar queries de localização (debounced) - usando novo sistema unificado
      debouncedInvalidateQueries(['unified-dashboard', 'localizacao-tempo-real']);
    });

    // Cleanup
    return () => {
      if (invalidationTimeoutRef.current) {
        clearTimeout(invalidationTimeoutRef.current);
      }
    };
  }, [
    subscribeToOrderUpdates,
    subscribeToDeliveryUpdates,
    subscribeToLocationUpdates,
    debouncedInvalidateQueries
  ]);

  return (
    <RealtimeContext.Provider value={{ isConnected, connectionStatus }}>
      {children}
    </RealtimeContext.Provider>
  );
};