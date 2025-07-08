import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePerformanceMonitor } from './usePerformanceMonitor';

export const useQueryPerformance = () => {
  const queryClient = useQueryClient();
  const { measureQuery } = usePerformanceMonitor();

  // Wrap query client methods with performance monitoring
  const performanceAwareQuery = useCallback(async (
    queryKey: string,
    queryFn: () => Promise<any>
  ) => {
    const startTime = performance.now();
    
    try {
      const result = await queryFn();
      const endTime = performance.now();
      
      // Measure successful query
      measureQuery(queryKey, startTime, endTime);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      // Measure failed query (still useful for performance tracking)
      measureQuery(`${queryKey}_ERROR`, startTime, endTime);
      
      // Log query error with performance context
      console.error(`Query failed: ${queryKey}`, {
        duration: endTime - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }, [measureQuery]);

  // Monitor existing queries in the cache
  const getQueryCacheMetrics = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const metrics = {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.state.status === 'pending').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      successQueries: queries.filter(q => q.state.status === 'success').length,
      cacheSize: queries.reduce((size, query) => {
        return size + (JSON.stringify(query.state.data || {}).length || 0);
      }, 0)
    };
    
    return metrics;
  }, [queryClient]);

  // Get slow queries
  const getSlowQueries = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return queries
      .filter(query => {
        const lastFetch = query.state.dataUpdatedAt;
        const fetchStart = query.state.fetchFailureReason ? 0 : lastFetch;
        return fetchStart > 0 && (Date.now() - fetchStart) > 2000; // Queries taking >2s
      })
      .map(query => ({
        queryKey: query.queryKey,
        status: query.state.status,
        lastFetch: query.state.dataUpdatedAt,
        error: query.state.error
      }));
  }, [queryClient]);

  // Clear performance data for queries
  const clearQueryMetrics = useCallback(() => {
    // Clear query cache if needed
    queryClient.clear();
  }, [queryClient]);

  // Setup query performance monitoring
  const setupQueryMonitoring = useCallback(() => {
    const cache = queryClient.getQueryCache();
    
    // Monitor query starts
    const unsubscribe = cache.subscribe(event => {
      if (event.type === 'observerAdded') {
        const query = event.query;
        const startTime = performance.now();
        
        // Cannot modify meta, use a different approach
        // query.meta = { ...query.meta, performanceStartTime: startTime };
      }
      
      if (event.type === 'observerResultsUpdated') {
        const query = event.query;
        const startTime = query.meta?.performanceStartTime;
        
        if (startTime && query.state.status === 'success') {
          const endTime = performance.now();
          const queryKey = query.queryKey.join('-');
          
          measureQuery(queryKey, startTime as number, endTime);
        }
      }
    });
    
    return unsubscribe;
  }, [queryClient, measureQuery]);

  return {
    performanceAwareQuery,
    getQueryCacheMetrics,
    getSlowQueries,
    clearQueryMetrics,
    setupQueryMonitoring
  };
};