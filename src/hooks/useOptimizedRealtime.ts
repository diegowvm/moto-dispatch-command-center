import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseOptimizedRealtimeOptions {
  throttleMs?: number;
  maxUpdatesPerSecond?: number;
}

export const useOptimizedRealtime = (
  table: string,
  onUpdate: (payload: any) => void,
  options: UseOptimizedRealtimeOptions = {}
) => {
  const { throttleMs = 1000, maxUpdatesPerSecond = 5 } = options;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const updateCountRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<any[]>([]);

  const throttledUpdate = useCallback((payload: any) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    // Reset counter every second
    if (timeSinceLastUpdate >= 1000) {
      updateCountRef.current = 0;
      lastUpdateRef.current = now;
    }

    // Check if we've exceeded the max updates per second
    if (updateCountRef.current >= maxUpdatesPerSecond) {
      // Queue the update for later
      pendingUpdatesRef.current.push(payload);
      
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          if (pendingUpdatesRef.current.length > 0) {
            // Process the latest update from the queue
            const latestUpdate = pendingUpdatesRef.current[pendingUpdatesRef.current.length - 1];
            onUpdate(latestUpdate);
            pendingUpdatesRef.current = [];
            updateCountRef.current++;
          }
          timeoutRef.current = null;
        }, throttleMs);
      }
      return;
    }

    // Process the update immediately
    updateCountRef.current++;
    onUpdate(payload);
  }, [onUpdate, maxUpdatesPerSecond, throttleMs]);

  const subscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        throttledUpdate
      )
      .subscribe();

    return channelRef.current;
  }, [table, throttledUpdate]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    pendingUpdatesRef.current = [];
  }, []);

  useEffect(() => {
    const channel = subscribe();

    return () => {
      unsubscribe();
    };
  }, [subscribe, unsubscribe]);

  return { subscribe, unsubscribe };
};

