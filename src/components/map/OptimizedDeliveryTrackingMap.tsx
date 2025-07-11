import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedRealtime } from '@/hooks/useOptimizedRealtime';
import { useLocationCache } from '@/hooks/useLocationCache';
import { env } from '@/lib/env';

interface EntregadorLocation {
  id: string;
  entregador_id: string;
  latitude: number;
  longitude: number;
  status: string;
  timestamp: string;
  entregador?: {
    usuario_id: string;
    usuarios: {
      id: string;
      nome: string;
    };
  };
}

interface DeliveryTrackingMapProps {
  className?: string;
  height?: string;
  maxEntregadores?: number;
}

export const OptimizedDeliveryTrackingMap = ({ 
  className, 
  height = "500px",
  maxEntregadores = 100
}: DeliveryTrackingMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [entregadores, setEntregadores] = useState<EntregadorLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cache for location data
  const locationCache = useLocationCache<EntregadorLocation>({
    ttl: 60000, // 1 minute
    maxSize: 500,
  });

  // Set Mapbox access token from environment
  mapboxgl.accessToken = env.mapbox.accessToken;

  // Memoized status configuration
  const statusConfig = useMemo(() => ({
    disponivel: { color: '#10b981', label: 'Disponível' },
    ocupado: { color: '#f59e0b', label: 'Ocupado' },
    em_entrega: { color: '#3b82f6', label: 'Em Entrega' },
    offline: { color: '#6b7280', label: 'Offline' },
  }), []);

  const getStatusColor = useCallback((status: string) => {
    return statusConfig[status as keyof typeof statusConfig]?.color || '#6b7280';
  }, [statusConfig]);

  const getStatusLabel = useCallback((status: string) => {
    return statusConfig[status as keyof typeof statusConfig]?.label || status;
  }, [statusConfig]);

  // Optimized marker creation
  const createMarker = useCallback((entregador: EntregadorLocation) => {
    const markerElement = document.createElement('div');
    markerElement.className = 'delivery-marker';
    markerElement.style.cssText = `
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: ${getStatusColor(entregador.status)};
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    `;

    markerElement.addEventListener('mouseenter', () => {
      markerElement.style.transform = 'scale(1.2)';
    });

    markerElement.addEventListener('mouseleave', () => {
      markerElement.style.transform = 'scale(1)';
    });

    const icon = document.createElement('div');
    icon.innerHTML = '🏍️';
    icon.style.fontSize = '12px';
    markerElement.appendChild(icon);

    return markerElement;
  }, [getStatusColor]);

  // Optimized popup creation
  const createPopup = useCallback((entregador: EntregadorLocation) => {
    return new mapboxgl.Popup({ 
      offset: 25,
      closeButton: true,
      closeOnClick: false,
    }).setHTML(`
      <div class="p-3 min-w-[200px]">
        <h4 class="font-semibold text-gray-800 mb-2">
          ${entregador.entregador?.usuarios?.nome || 'Entregador'}
        </h4>
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" style="background-color: ${getStatusColor(entregador.status)}"></span>
            <span class="text-sm font-medium">${getStatusLabel(entregador.status)}</span>
          </div>
          <div class="text-xs text-gray-500">
            Última atualização: ${new Date(entregador.timestamp).toLocaleTimeString('pt-BR')}
          </div>
          <div class="text-xs text-gray-400">
            ${entregador.latitude.toFixed(6)}, ${entregador.longitude.toFixed(6)}
          </div>
        </div>
      </div>
    `);
  }, [getStatusColor, getStatusLabel]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-47.062, -15.614], // Brasília default
        zoom: 10,
        attributionControl: false,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

      // Add loading indicator
      map.current.on('sourcedata', () => {
        if (map.current?.isSourceLoaded('composite')) {
          setIsLoading(false);
        }
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Erro ao inicializar o mapa. Verifique a configuração do Mapbox.');
    }

    return () => {
      map.current?.remove();
    };
  }, []);

  // Optimized data loading with pagination and caching
  const loadEntregadoresLocalizacao = useCallback(async (useCache = true) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check cache first
      if (useCache) {
        const cachedData = locationCache.get('entregadores_locations');
        if (cachedData) {
          setEntregadores([cachedData]);
          setLastUpdate(new Date());
          setIsLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('localizacao_tempo_real')
        .select(`
          id,
          entregador_id,
          latitude,
          longitude,
          status,
          timestamp,
          entregadores!inner(
            id,
            usuario_id,
            usuarios!inner(id, nome)
          )
        `)
        .in('status', ['disponivel', 'ocupado', 'em_entrega'])
        .order('timestamp', { ascending: false })
        .limit(maxEntregadores);

      if (error) throw error;

      const locations = data || [];
      
      // Cache the data
      locations.forEach((location) => {
        locationCache.set(`location_${location.entregador_id}`, location);
      });

      setEntregadores(locations);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading delivery locations:', error);
      setError('Erro ao carregar localizações dos entregadores.');
    } finally {
      setIsLoading(false);
    }
  }, [locationCache, maxEntregadores]);

  // Load initial data
  useEffect(() => {
    loadEntregadoresLocalizacao();
  }, [loadEntregadoresLocalizacao]);

  // Optimized marker updates
  const updateMarkers = useCallback(() => {
    if (!map.current || !entregadores.length) return;

    // Remove markers for entregadores no longer in the list
    const currentEntregadorIds = new Set(entregadores.map(e => e.entregador_id));
    for (const [id, marker] of markers.current.entries()) {
      if (!currentEntregadorIds.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidCoordinates = false;

    entregadores.forEach((entregador) => {
      if (!entregador.latitude || !entregador.longitude) return;

      const coords: [number, number] = [entregador.longitude, entregador.latitude];
      const existingMarker = markers.current.get(entregador.entregador_id);

      if (existingMarker) {
        // Update existing marker position and popup
        existingMarker.setLngLat(coords);
        existingMarker.setPopup(createPopup(entregador));
      } else {
        // Create new marker
        const markerElement = createMarker(entregador);
        const marker = new mapboxgl.Marker({ element: markerElement })
          .setLngLat(coords)
          .setPopup(createPopup(entregador))
          .addTo(map.current!);

        markers.current.set(entregador.entregador_id, marker);
      }

      bounds.extend(coords);
      hasValidCoordinates = true;
    });

    // Fit map to show all markers
    if (hasValidCoordinates && entregadores.length > 1) {
      map.current.fitBounds(bounds, { 
        padding: 50,
        maxZoom: 15,
        duration: 1000,
      });
    }
  }, [entregadores, createMarker, createPopup]);

  // Update markers when entregadores data changes
  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // Optimized real-time updates
  const handleLocationUpdate = useCallback((payload: any) => {
    console.log('Location update received:', payload);
    
    const newLocation = payload.new;
    
    // Update cache
    locationCache.set(`location_${newLocation.entregador_id}`, newLocation);
    
    setEntregadores((prev) => {
      const updated = [...prev];
      const index = updated.findIndex(e => e.entregador_id === newLocation.entregador_id);
      
      if (index >= 0) {
        updated[index] = { ...updated[index], ...newLocation };
      } else if (updated.length < maxEntregadores) {
        // Add new entregador location if under limit
        updated.push(newLocation);
      }
      
      return updated;
    });
    
    setLastUpdate(new Date());
  }, [locationCache, maxEntregadores]);

  // Subscribe to real-time updates with throttling
  useOptimizedRealtime('localizacao_tempo_real', handleLocationUpdate, {
    throttleMs: 2000,
    maxUpdatesPerSecond: 3,
  });

  // Cleanup cache periodically
  useEffect(() => {
    const interval = setInterval(() => {
      locationCache.cleanup();
    }, 60000); // Cleanup every minute

    return () => clearInterval(interval);
  }, [locationCache]);

  // Memoized status counts
  const statusCounts = useMemo(() => {
    return entregadores.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [entregadores]);

  const handleRefresh = useCallback(() => {
    loadEntregadoresLocalizacao(false); // Force refresh without cache
  }, [loadEntregadoresLocalizacao]);

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button onClick={handleRefresh} className="mt-2">
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            <CardTitle>Rastreamento de Entregadores</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
              </span>
            )}
            <Button 
              onClick={handleRefresh}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Status Summary */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total: {entregadores.length}</span>
          </div>
          {Object.entries(statusCounts).map(([status, count]) => (
            <Badge 
              key={status}
              variant="secondary"
              className="text-xs"
              style={{ 
                backgroundColor: `${getStatusColor(status)}20`,
                color: getStatusColor(status),
                border: `1px solid ${getStatusColor(status)}40`
              }}
            >
              {getStatusLabel(status)}: {count}
            </Badge>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="relative">
          <div 
            ref={mapContainer} 
            className="w-full rounded-md border"
            style={{ height }}
          />
          
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-md">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando localizações...</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

