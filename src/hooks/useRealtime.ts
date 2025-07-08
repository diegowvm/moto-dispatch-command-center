import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export const useRealtime = () => {
  const [isConnected, setIsConnected] = useState(false);
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, []);

  const createChannel = useCallback((channelName: string) => {
    const channel = supabase.channel(channelName);
    channelsRef.current.push(channel);
    return channel;
  }, []);

  const subscribeToTable = useCallback((
    tableName: string,
    callback: (payload: any) => void,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
  ) => {
    const channel = createChannel(`${tableName}-changes`);
    
    channel
      .on('postgres_changes' as any, {
        event,
        schema: 'public',
        table: tableName
      }, callback)
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return channel;
  }, [createChannel]);

  const subscribeToLocationUpdates = useCallback((callback: (payload: any) => void) => {
    return subscribeToTable('localizacao_tempo_real', callback, 'UPDATE');
  }, [subscribeToTable]);

  const subscribeToOrderUpdates = useCallback((callback: (payload: any) => void) => {
    return subscribeToTable('pedidos', callback);
  }, [subscribeToTable]);

  const subscribeToDeliveryUpdates = useCallback((callback: (payload: any) => void) => {
    return subscribeToTable('entregadores', callback, 'UPDATE');
  }, [subscribeToTable]);

  return {
    isConnected,
    subscribeToTable,
    subscribeToLocationUpdates,
    subscribeToOrderUpdates,
    subscribeToDeliveryUpdates,
    createChannel
  };
};