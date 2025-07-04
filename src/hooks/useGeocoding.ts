import { useState, useCallback } from 'react';
import { geocodingService, GeocodeResult } from '@/services/geocodingService';

interface UseGeocodingReturn {
  geocode: (address: string) => Promise<GeocodeResult | null>;
  reverseGeocode: (lat: number, lng: number) => Promise<GeocodeResult | null>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useGeocoding = (): UseGeocodingReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const geocode = useCallback(async (address: string): Promise<GeocodeResult | null> => {
    if (!address.trim()) return null;

    setIsLoading(true);
    setError(null);

    try {
      const result = await geocodingService.geocodeAddress(address);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao geocodificar endereço';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<GeocodeResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await geocodingService.reverseGeocodeCoordinates(lat, lng);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer geocodificação reversa';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    geocode,
    reverseGeocode,
    isLoading,
    error,
    clearError
  };
};