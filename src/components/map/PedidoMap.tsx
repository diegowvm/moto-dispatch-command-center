import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Route, Loader2, AlertCircle } from 'lucide-react';
import { useGeocoding } from '@/hooks/useGeocoding';
import { useRouting } from '@/hooks/useRouting';
import { routingService } from '@/services/routingService';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PedidoMapProps {
  enderecoColeta: string;
  enderecoEntrega: string;
  cidadeColeta: string;
  cidadeEntrega: string;
  className?: string;
}

export const PedidoMap = ({ 
  enderecoColeta, 
  enderecoEntrega, 
  cidadeColeta, 
  cidadeEntrega,
  className 
}: PedidoMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [coordinates, setCoordinates] = useState<{
    coleta?: [number, number];
    entrega?: [number, number];
  }>({});

  const { geocode, isLoading: geocodingLoading, error: geocodingError } = useGeocoding();
  const { calculateRoute, isLoading: routingLoading, error: routingError } = useRouting();

  // Mapbox access token
  mapboxgl.accessToken = 'pk.eyJ1IjoiZGllZ293dm0iLCJhIjoiY21jcDZqczRoMDM0YzJscHhkdjNnbm9reCJ9.LsZ2a4vZdP5MKnv30Wneww';

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-47.062, -15.614], // Brasília default
      zoom: 10
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, []);

  // Geocode addresses when component mounts
  useEffect(() => {
    const geocodeAddresses = async () => {
      try {
        const [coletaResult, entregaResult] = await Promise.all([
          geocode(`${enderecoColeta}, ${cidadeColeta}`),
          geocode(`${enderecoEntrega}, ${cidadeEntrega}`)
        ]);

        const newCoordinates: { coleta?: [number, number]; entrega?: [number, number] } = {};

        if (coletaResult) {
          newCoordinates.coleta = [coletaResult.longitude, coletaResult.latitude];
        }
        if (entregaResult) {
          newCoordinates.entrega = [entregaResult.longitude, entregaResult.latitude];
        }

        setCoordinates(newCoordinates);
      } catch (error) {
        console.error('Error geocoding addresses:', error);
      }
    };

    if (enderecoColeta && enderecoEntrega) {
      geocodeAddresses();
    }
  }, [enderecoColeta, enderecoEntrega, cidadeColeta, cidadeEntrega, geocode]);

  // Add markers when coordinates are available
  useEffect(() => {
    if (!map.current || (!coordinates.coleta && !coordinates.entrega)) return;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());

    const bounds = new mapboxgl.LngLatBounds();

    // Add coleta marker
    if (coordinates.coleta) {
      const coletaMarker = new mapboxgl.Marker({
        color: '#3b82f6', // blue
        scale: 1.2
      })
        .setLngLat(coordinates.coleta)
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <h4 class="font-semibold text-blue-600">Ponto de Coleta</h4>
            <p class="text-sm">${enderecoColeta}</p>
            <p class="text-xs text-gray-500">${cidadeColeta}</p>
          </div>
        `))
        .addTo(map.current);

      bounds.extend(coordinates.coleta);
    }

    // Add entrega marker
    if (coordinates.entrega) {
      const entregaMarker = new mapboxgl.Marker({
        color: '#10b981', // green
        scale: 1.2
      })
        .setLngLat(coordinates.entrega)
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <h4 class="font-semibold text-green-600">Ponto de Entrega</h4>
            <p class="text-sm">${enderecoEntrega}</p>
            <p class="text-xs text-gray-500">${cidadeEntrega}</p>
          </div>
        `))
        .addTo(map.current);

      bounds.extend(coordinates.entrega);
    }

    // Fit map to show both markers
    if (coordinates.coleta && coordinates.entrega) {
      map.current.fitBounds(bounds, { padding: 50 });
    } else if (coordinates.coleta) {
      map.current.setCenter(coordinates.coleta);
      map.current.setZoom(14);
    } else if (coordinates.entrega) {
      map.current.setCenter(coordinates.entrega);
      map.current.setZoom(14);
    }
  }, [coordinates, enderecoColeta, enderecoEntrega, cidadeColeta, cidadeEntrega]);

  // Handle route visualization
  const handleShowRoute = async () => {
    if (!coordinates.coleta || !coordinates.entrega) return;

    try {
      const route = await calculateRoute(coordinates.coleta, coordinates.entrega);
      if (route && map.current) {
        setRouteData(route);
        setShowRoute(true);

        // Add route to map
        if (map.current.getSource('route')) {
          map.current.removeLayer('route');
          map.current.removeSource('route');
        }

        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: route.geometry
            }
          }
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#f59e0b',
            'line-width': 4,
            'line-opacity': 0.8
          }
        });
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  const handleHideRoute = () => {
    if (map.current && map.current.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }
    setShowRoute(false);
    setRouteData(null);
  };

  const canShowRoute = coordinates.coleta && coordinates.entrega;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Localização do Pedido</h3>
            </div>
            
            {canShowRoute && (
              <div className="flex gap-2">
                {!showRoute ? (
                  <Button
                    onClick={handleShowRoute}
                    disabled={routingLoading}
                    size="sm"
                    variant="outline"
                  >
                    {routingLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Route className="w-4 h-4 mr-2" />
                    )}
                    Visualizar Rota
                  </Button>
                ) : (
                  <Button
                    onClick={handleHideRoute}
                    size="sm"
                    variant="outline"
                  >
                    Ocultar Rota
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Error alerts */}
          {geocodingError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{geocodingError}</AlertDescription>
            </Alert>
          )}

          {routingError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{routingError}</AlertDescription>
            </Alert>
          )}

          {/* Loading state */}
          {geocodingLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Geocodificando endereços...</span>
            </div>
          )}

          {/* Map container */}
          <div className="relative">
            <div 
              ref={mapContainer} 
              className="w-full h-64 rounded-md border"
            />
          </div>

          {/* Route information */}
          {routeData && showRoute && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <h4 className="font-medium text-amber-800 mb-2">Informações da Rota</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-amber-700">Distância:</span>
                  <span className="font-medium ml-2">
                    {routingService.formatDistance(routeData.distance)}
                  </span>
                </div>
                <div>
                  <span className="text-amber-700">Tempo estimado:</span>
                  <span className="font-medium ml-2">
                    {routingService.formatDuration(routeData.duration)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Coordinate information */}
          {(coordinates.coleta || coordinates.entrega) && (
            <div className="text-xs text-muted-foreground space-y-1">
              {coordinates.coleta && (
                <div>
                  <span className="text-blue-600">Coleta:</span> {coordinates.coleta[1].toFixed(6)}, {coordinates.coleta[0].toFixed(6)}
                </div>
              )}
              {coordinates.entrega && (
                <div>
                  <span className="text-green-600">Entrega:</span> {coordinates.entrega[1].toFixed(6)}, {coordinates.entrega[0].toFixed(6)}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};