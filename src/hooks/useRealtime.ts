import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export const useRealtime = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [channels, setChannels] = useState<RealtimeChannel[]>([]);

  useEffect(() => {
    const handleConnectionChange = (status: string) => {
      setIsConnected(status === 'SUBSCRIBED');
    };

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [channels]);

  const createChannel = (channelName: string) => {
    const channel = supabase.channel(channelName);
    setChannels(prev => [...prev, channel]);
    return channel;
  };

  const subscribeToTable = (
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
  };

  const subscribeToLocationUpdates = (callback: (payload: any) => void) => {
    return subscribeToTable('localizacao_tempo_real', callback, 'UPDATE');
  };

  const subscribeToOrderUpdates = (callback: (payload: any) => void) => {
    return subscribeToTable('pedidos', callback);
  };

  const subscribeToDeliveryUpdates = (callback: (payload: any) => void) => {
    return subscribeToTable('entregadores', callback, 'UPDATE');
  };

  return {
    isConnected,
    subscribeToTable,
    subscribeToLocationUpdates,
    subscribeToOrderUpdates,
    subscribeToDeliveryUpdates,
    createChannel
  };
};