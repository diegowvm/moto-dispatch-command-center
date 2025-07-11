import { useState, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface UseLocationCacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

export const useLocationCache = <T>(options: UseLocationCacheOptions = {}) => {
  const { ttl = 30000, maxSize = 1000 } = options; // 30 seconds default TTL
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const [cacheSize, setCacheSize] = useState(0);

  const get = useCallback((key: string): T | null => {
    const entry = cacheRef.current.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      cacheRef.current.delete(key);
      setCacheSize(cacheRef.current.size);
      return null;
    }

    return entry.data;
  }, []);

  const set = useCallback((key: string, data: T): void => {
    const now = Date.now();
    
    // Remove expired entries before adding new one
    for (const [k, entry] of cacheRef.current.entries()) {
      if (now > entry.expiresAt) {
        cacheRef.current.delete(k);
      }
    }

    // If cache is at max size, remove oldest entry
    if (cacheRef.current.size >= maxSize) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey) {
        cacheRef.current.delete(firstKey);
      }
    }

    cacheRef.current.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });

    setCacheSize(cacheRef.current.size);
  }, [ttl, maxSize]);

  const remove = useCallback((key: string): boolean => {
    const deleted = cacheRef.current.delete(key);
    if (deleted) {
      setCacheSize(cacheRef.current.size);
    }
    return deleted;
  }, []);

  const clear = useCallback((): void => {
    cacheRef.current.clear();
    setCacheSize(0);
  }, []);

  const has = useCallback((key: string): boolean => {
    const entry = cacheRef.current.get(key);
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      cacheRef.current.delete(key);
      setCacheSize(cacheRef.current.size);
      return false;
    }

    return true;
  }, []);

  const cleanup = useCallback((): void => {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of cacheRef.current.entries()) {
      if (now > entry.expiresAt) {
        cacheRef.current.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      setCacheSize(cacheRef.current.size);
    }
  }, []);

  return {
    get,
    set,
    remove,
    clear,
    has,
    cleanup,
    size: cacheSize,
  };
};

