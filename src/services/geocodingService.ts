interface GeocodeResult {
  latitude: number;
  longitude: number;
  formatted: string;
  confidence: number;
  components: {
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

interface OpenCageResponse {
  results: Array<{
    geometry: {
      lat: number;
      lng: number;
    };
    formatted: string;
    confidence: number;
    components: Record<string, string>;
  }>;
  status: {
    code: number;
    message: string;
  };
}

class GeocodingService {
  private readonly apiKey = '298b36f91ff343deab8f0592a5fc69cb';
  private readonly baseUrl = 'https://api.opencagedata.com/geocode/v1/json';
  private cache = new Map<string, GeocodeResult>();

  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!address.trim()) return null;

    // Check cache first
    const cacheKey = address.toLowerCase().trim();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const url = `${this.baseUrl}?q=${encodeURIComponent(address)}&key=${this.apiKey}&limit=1&language=pt&countrycode=br`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OpenCageResponse = await response.json();

      if (data.status.code !== 200) {
        throw new Error(`OpenCage API error: ${data.status.message}`);
      }

      if (data.results.length === 0) {
        return null;
      }

      const result = data.results[0];
      const geocodeResult: GeocodeResult = {
        latitude: result.geometry.lat,
        longitude: result.geometry.lng,
        formatted: result.formatted,
        confidence: result.confidence,
        components: {
          city: result.components.city || result.components.town || result.components.village,
          state: result.components.state,
          country: result.components.country,
          postcode: result.components.postcode
        }
      };

      // Cache the result
      this.cache.set(cacheKey, geocodeResult);
      
      return geocodeResult;
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new Error(`Erro ao geocodificar endereço: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async reverseGeocodeCoordinates(lat: number, lng: number): Promise<GeocodeResult | null> {
    const cacheKey = `${lat},${lng}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const url = `${this.baseUrl}?q=${lat}+${lng}&key=${this.apiKey}&limit=1&language=pt`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OpenCageResponse = await response.json();

      if (data.status.code !== 200 || data.results.length === 0) {
        return null;
      }

      const result = data.results[0];
      const geocodeResult: GeocodeResult = {
        latitude: result.geometry.lat,
        longitude: result.geometry.lng,
        formatted: result.formatted,
        confidence: result.confidence,
        components: {
          city: result.components.city || result.components.town || result.components.village,
          state: result.components.state,
          country: result.components.country,
          postcode: result.components.postcode
        }
      };

      this.cache.set(cacheKey, geocodeResult);
      return geocodeResult;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw new Error(`Erro ao fazer geocodificação reversa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export const geocodingService = new GeocodingService();
export type { GeocodeResult };