import { useState, useCallback } from 'react';
import { routingService, RouteResult, RouteProfile } from '@/services/routingService';

interface UseRoutingReturn {
  calculateRoute: (
    startCoords: [number, number], 
    endCoords: [number, number], 
    profile?: RouteProfile
  ) => Promise<RouteResult | null>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useRouting = (): UseRoutingReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const calculateRoute = useCallback(async (
    startCoords: [number, number], 
    endCoords: [number, number], 
    profile: RouteProfile = 'driving-car'
  ): Promise<RouteResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await routingService.getRoute(startCoords, endCoords, profile);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao calcular rota';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    calculateRoute,
    isLoading,
    error,
    clearError
  };
};