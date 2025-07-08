import { useEffect, useState, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  // Navigation timing
  pageLoadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  
  // Query performance
  queryTimes: Record<string, number>;
  avgQueryTime: number;
  
  // Memory usage
  memoryUsage: number;
  
  // Connection info
  connectionType: string;
  effectiveType: string;
  
  // Bundle size
  bundleSize: number;
  
  // Real-time metrics
  isSlowConnection: boolean;
  isLowMemory: boolean;
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const queryTimesRef = useRef<Record<string, number>>({});
  const alertsRef = useRef<string[]>([]);

  // Measure query performance
  const measureQuery = useCallback((queryKey: string, startTime: number, endTime: number) => {
    const duration = endTime - startTime;
    queryTimesRef.current[queryKey] = duration;
    
    // Alert for slow queries (>2 seconds)
    if (duration > 2000) {
      alertsRef.current.push(`Slow query detected: ${queryKey} took ${duration}ms`);
      console.warn(`🐌 SLOW QUERY: ${queryKey} - ${duration}ms`);
    }
    
    // Update average
    const times = Object.values(queryTimesRef.current);
    const avgQueryTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    
    setMetrics(prev => ({
      ...prev,
      queryTimes: { ...queryTimesRef.current },
      avgQueryTime
    }));
  }, []);

  // Get navigation timing
  const getNavigationTiming = useCallback(() => {
    if (typeof window === 'undefined' || !window.performance) return {};

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    return {
      pageLoadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
      firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
    };
  }, []);

  // Get LCP (Largest Contentful Paint)
  const measureLCP = useCallback(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      setMetrics(prev => ({
        ...prev,
        largestContentfulPaint: lastEntry.startTime
      }));

      // Alert for slow LCP (>2.5 seconds)
      if (lastEntry.startTime > 2500) {
        alertsRef.current.push(`Slow LCP detected: ${lastEntry.startTime}ms`);
        console.warn(`🐌 SLOW LCP: ${lastEntry.startTime}ms`);
      }
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    return () => observer.disconnect();
  }, []);

  // Get memory usage
  const getMemoryUsage = useCallback(() => {
    if (typeof window === 'undefined' || !('memory' in performance)) return 0;
    
    const memory = (performance as any).memory;
    const usedMemory = memory.usedJSHeapSize;
    const totalMemory = memory.totalJSHeapSize;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    // Alert for high memory usage (>80%)
    const isLowMemory = memoryUsagePercent > 80;
    if (isLowMemory && !alertsRef.current.includes('High memory usage')) {
      alertsRef.current.push('High memory usage detected');
      console.warn(`🧠 HIGH MEMORY: ${memoryUsagePercent.toFixed(1)}%`);
    }
    
    return {
      memoryUsage: memoryUsagePercent,
      isLowMemory
    };
  }, []);

  // Get connection info
  const getConnectionInfo = useCallback(() => {
    if (typeof window === 'undefined' || !('connection' in navigator)) {
      return { connectionType: 'unknown', effectiveType: 'unknown', isSlowConnection: false };
    }
    
    const connection = (navigator as any).connection;
    const isSlowConnection = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
    
    if (isSlowConnection && !alertsRef.current.includes('Slow connection')) {
      alertsRef.current.push('Slow connection detected');
      console.warn(`📶 SLOW CONNECTION: ${connection.effectiveType}`);
    }
    
    return {
      connectionType: connection.type || 'unknown',
      effectiveType: connection.effectiveType || 'unknown',
      isSlowConnection
    };
  }, []);

  // Monitor bundle size
  const getBundleSize = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    
    // Estimate bundle size from loaded resources
    const resources = performance.getEntriesByType('resource');
    const jsResources = resources.filter(resource => 
      resource.name.includes('.js') && resource.name.includes(window.location.origin)
    );
    
    const totalSize = jsResources.reduce((sum, resource) => {
      return sum + ((resource as any).transferSize || 0);
    }, 0);
    
    const bundleSizeMB = totalSize / (1024 * 1024);
    
    // Alert for large bundle (>2MB)
    if (bundleSizeMB > 2 && !alertsRef.current.includes('Large bundle')) {
      alertsRef.current.push('Large bundle size detected');
      console.warn(`📦 LARGE BUNDLE: ${bundleSizeMB.toFixed(2)}MB`);
    }
    
    return bundleSizeMB;
  }, []);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    
    // Initial measurements
    const navTiming = getNavigationTiming();
    const memoryInfo = getMemoryUsage();
    const connectionInfo = getConnectionInfo();
    const bundleSize = getBundleSize();
    
    setMetrics({
      ...navTiming,
      ...memoryInfo,
      ...connectionInfo,
      bundleSize,
      queryTimes: {},
      avgQueryTime: 0
    });
    
    // Setup LCP observer
    const cleanupLCP = measureLCP();
    
    // Monitor memory every 10 seconds
    const memoryInterval = setInterval(() => {
      const memoryInfo = getMemoryUsage();
      setMetrics(prev => ({ ...prev, ...memoryInfo }));
    }, 10000);
    
    return () => {
      cleanupLCP?.();
      clearInterval(memoryInterval);
    };
  }, [getNavigationTiming, getMemoryUsage, getConnectionInfo, getBundleSize, measureLCP]);

  // Get performance report
  const getPerformanceReport = useCallback(() => {
    const report = {
      metrics,
      alerts: [...alertsRef.current],
      timestamp: Date.now(),
      recommendations: [] as string[]
    };
    
    // Generate recommendations
    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) {
      report.recommendations.push('Consider lazy loading images and optimizing largest content');
    }
    
    if (metrics.avgQueryTime && metrics.avgQueryTime > 1000) {
      report.recommendations.push('Consider optimizing database queries or implementing better caching');
    }
    
    if (metrics.isLowMemory) {
      report.recommendations.push('High memory usage detected - consider code splitting or cleanup');
    }
    
    if (metrics.bundleSize && metrics.bundleSize > 1) {
      report.recommendations.push('Large bundle size - consider code splitting and tree shaking');
    }
    
    return report;
  }, [metrics]);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    alertsRef.current = [];
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cleanup = startMonitoring();
      return cleanup;
    }
  }, [startMonitoring]);

  return {
    metrics,
    isMonitoring,
    measureQuery,
    getPerformanceReport,
    clearAlerts,
    alerts: alertsRef.current
  };
};