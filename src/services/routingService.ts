interface RouteResult {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: number[][]; // [lng, lat] coordinates
  instructions: Array<{
    text: string;
    distance: number;
    duration: number;
  }>;
}

interface OpenRouteServiceResponse {
  features: Array<{
    geometry: {
      coordinates: number[][];
    };
    properties: {
      segments: Array<{
        distance: number;
        duration: number;
        steps: Array<{
          instruction: string;
          distance: number;
          duration: number;
        }>;
      }>;
      summary: {
        distance: number;
        duration: number;
      };
    };
  }>;
}

type RouteProfile = 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'foot-walking';

class RoutingService {
  private readonly apiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjNhMjQ2MWYzZmE0MTQ3NjU5NGIyZWZhMTJhOGE0ZjEwIiwiaCI6Im11cm11cjY0In0=';
  private readonly baseUrl = 'https://api.openrouteservice.org/v2/directions';
  private cache = new Map<string, RouteResult>();

  async getRoute(
    startCoords: [number, number], // [lng, lat]
    endCoords: [number, number],   // [lng, lat] 
    profile: RouteProfile = 'driving-car'
  ): Promise<RouteResult | null> {
    const cacheKey = `${startCoords.join(',')}-${endCoords.join(',')}-${profile}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const url = `${this.baseUrl}/${profile}/geojson`;
      const requestBody = {
        coordinates: [startCoords, endCoords],
        format: 'geojson',
        instructions: true,
        language: 'pt'
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OpenRouteServiceResponse = await response.json();

      if (data.features.length === 0) {
        return null;
      }

      const feature = data.features[0];
      const segment = feature.properties.segments[0];

      const routeResult: RouteResult = {
        distance: feature.properties.summary.distance,
        duration: feature.properties.summary.duration,
        geometry: feature.geometry.coordinates,
        instructions: segment.steps.map(step => ({
          text: step.instruction,
          distance: step.distance,
          duration: step.duration
        }))
      };

      this.cache.set(cacheKey, routeResult);
      return routeResult;
    } catch (error) {
      console.error('Routing error:', error);
      throw new Error(`Erro ao calcular rota: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }

  clearCache() {
    this.cache.clear();
  }
}

export const routingService = new RoutingService();
export type { RouteResult, RouteProfile };