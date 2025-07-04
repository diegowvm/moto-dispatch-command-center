import React, { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected]);

  useEffect(() => {
    // Subscrever a atualizações de pedidos
    const orderChannel = subscribeToOrderUpdates((payload) => {
      console.log('Atualização de pedido:', payload);
      
      // Invalidar queries relacionadas a pedidos
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-metrics'] });

      const { eventType, new: newRecord, old: oldRecord } = payload;

      // TODO: Implement notifications
      console.log('Order event:', eventType, newRecord);
    });

    // Subscrever a atualizações de entregadores
    const deliveryChannel = subscribeToDeliveryUpdates((payload) => {
      console.log('Atualização de entregador:', payload);
      
      // Invalidar queries relacionadas a entregadores
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });

      const { eventType, new: newRecord, old: oldRecord } = payload;

      // TODO: Implement delivery notifications
      console.log('Delivery event:', eventType, newRecord);
    });

    // Subscrever a atualizações de localização
    const locationChannel = subscribeToLocationUpdates((payload) => {
      console.log('Atualização de localização:', payload);
      
      // Invalidar queries de localização
      queryClient.invalidateQueries({ queryKey: ['localizacao-tempo-real'] });
    });

    // Cleanup
    return () => {
      // Os canais são automaticamente limpos pelo hook useRealtime
    };
  }, [
    subscribeToOrderUpdates,
    subscribeToDeliveryUpdates,
    subscribeToLocationUpdates,
    queryClient
  ]);

  return (
    <RealtimeContext.Provider value={{ isConnected, connectionStatus }}>
      {children}
    </RealtimeContext.Provider>
  );
};