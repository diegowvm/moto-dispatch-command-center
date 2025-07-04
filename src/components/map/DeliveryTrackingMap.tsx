import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Users, RefreshCw } from 'lucide-react';
import { useRealtime } from '@/hooks/useRealtime';
import { supabase } from '@/integrations/supabase/client';

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
}

export const DeliveryTrackingMap = ({ 
  className, 
  height = "500px" 
}: DeliveryTrackingMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [entregadores, setEntregadores] = useState<EntregadorLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { subscribeToLocationUpdates } = useRealtime();

  // Mapbox access token
  mapboxgl.accessToken = 'pk.eyJ1IjoiZGllZ293dm0iLCJhIjoiY21jcDZqczRoMDM0YzJscHhkdjNnbm9reCJ9.LsZ2a4vZdP5MKnv30Wneww';

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponivel':
        return '#10b981'; // green
      case 'ocupado':
        return '#f59e0b'; // amber
      case 'em_entrega':
        return '#3b82f6'; // blue
      case 'offline':
        return '#6b7280'; // gray
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'disponivel':
        return 'Disponível';
      case 'ocupado':
        return 'Ocupado';
      case 'em_entrega':
        return 'Em Entrega';
      case 'offline':
        return 'Offline';
      default:
        return status;
    }
  };

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

  // Load initial data
  useEffect(() => {
    const loadEntregadoresLocalizacao = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('localizacao_tempo_real')
          .select(`
            *,
            entregadores!inner(
              id,
              usuario_id,
              usuarios!inner(id, nome)
            )
          `)
          .in('status', ['disponivel', 'ocupado', 'em_entrega']);

        if (error) throw error;

        setEntregadores(data || []);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Error loading delivery locations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEntregadoresLocalizacao();
  }, []);

  // Update markers when entregadores data changes
  useEffect(() => {
    if (!map.current || !entregadores.length) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current.clear();

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidCoordinates = false;

    entregadores.forEach((entregador) => {
      if (!entregador.latitude || !entregador.longitude) return;

      const coords: [number, number] = [entregador.longitude, entregador.latitude];
      
      // Create custom marker element
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
      `;

      // Add status icon
      const icon = document.createElement('div');
      icon.innerHTML = '🏍️';
      icon.style.fontSize = '12px';
      markerElement.appendChild(icon);

      const marker = new mapboxgl.Marker({ element: markerElement })
        .setLngLat(coords)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-3">
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
          `)
        )
        .addTo(map.current);

      markers.current.set(entregador.entregador_id, marker);
      bounds.extend(coords);
      hasValidCoordinates = true;
    });

    // Fit map to show all markers
    if (hasValidCoordinates) {
      map.current.fitBounds(bounds, { 
        padding: 50,
        maxZoom: 15
      });
    }
  }, [entregadores]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = subscribeToLocationUpdates((payload) => {
      console.log('Location update received:', payload);
      
      setEntregadores((prev) => {
        const updated = [...prev];
        const index = updated.findIndex(e => e.entregador_id === payload.new.entregador_id);
        
        if (index >= 0) {
          updated[index] = { ...updated[index], ...payload.new };
        } else {
          // Add new entregador location
          updated.push(payload.new);
        }
        
        return updated;
      });
      
      setLastUpdate(new Date());
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [subscribeToLocationUpdates]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('localizacao_tempo_real')
        .select(`
          *,
          entregadores!inner(
            id,
            usuario_id,
            usuarios!inner(id, nome)
          )
        `)
        .in('status', ['disponivel', 'ocupado', 'em_entrega']);

      if (error) throw error;

      setEntregadores(data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error refreshing delivery locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusCounts = entregadores.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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