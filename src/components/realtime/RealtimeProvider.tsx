import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { useLogtechNotifications } from '@/hooks/useNotifications';
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

  const {
    notifyNewOrder,
    notifyOrderDelivered,
    notifyDeliveryOnline,
    notifyDeliveryOffline,
    notifyOrderStatusUpdate
  } = useLogtechNotifications();

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

      if (eventType === 'INSERT') {
        // Novo pedido criado
        notifyNewOrder(
          newRecord.numero_pedido,
          'Nova empresa' // Em produção, buscar o nome da empresa
        );
      } else if (eventType === 'UPDATE') {
        // Status do pedido atualizado
        if (oldRecord.status !== newRecord.status) {
          notifyOrderStatusUpdate(newRecord.numero_pedido, newRecord.status);
          
          if (newRecord.status === 'entregue') {
            notifyOrderDelivered(
              newRecord.numero_pedido,
              'Entregador' // Em produção, buscar o nome do entregador
            );
          }
        }
      }
    });

    // Subscrever a atualizações de entregadores
    const deliveryChannel = subscribeToDeliveryUpdates((payload) => {
      console.log('Atualização de entregador:', payload);
      
      // Invalidar queries relacionadas a entregadores
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });

      const { eventType, new: newRecord, old: oldRecord } = payload;

      if (eventType === 'UPDATE' && oldRecord.status !== newRecord.status) {
        // Status do entregador mudou
        if (newRecord.status === 'disponivel' && oldRecord.status === 'offline') {
          notifyDeliveryOnline('Entregador'); // Em produção, buscar o nome
        } else if (newRecord.status === 'offline' && oldRecord.status !== 'offline') {
          notifyDeliveryOffline('Entregador'); // Em produção, buscar o nome
        }
      }
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
    queryClient,
    notifyNewOrder,
    notifyOrderDelivered,
    notifyDeliveryOnline,
    notifyDeliveryOffline,
    notifyOrderStatusUpdate
  ]);

  return (
    <RealtimeContext.Provider value={{ isConnected, connectionStatus }}>
      {children}
    </RealtimeContext.Provider>
  );
};