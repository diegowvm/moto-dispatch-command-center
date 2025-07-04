import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Navigation, 
  Users, 
  Search,
  Filter,
  RefreshCw
} from "lucide-react";

// Fix for default Leaflet markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different delivery statuses
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const availableIcon = createCustomIcon('#10b981'); // Green
const busyIcon = createCustomIcon('#f59e0b'); // Orange  
const offlineIcon = createCustomIcon('#6b7280'); // Gray

interface Delivery {
  id: string;
  name: string;
  phone: string;
  status: 'disponivel' | 'ocupado' | 'offline';
  location: {
    lat: number;
    lng: number;
  };
  currentOrder?: string;
  rating: number;
  completedToday: number;
}

// Mock data for delivery drivers
const mockDeliveries: Delivery[] = [
  {
    id: '1',
    name: 'João Silva',
    phone: '(11) 99999-9999',
    status: 'disponivel',
    location: { lat: -23.5505, lng: -46.6333 },
    rating: 4.8,
    completedToday: 12
  },
  {
    id: '2',
    name: 'Maria Santos',
    phone: '(11) 88888-8888',
    status: 'ocupado',
    location: { lat: -23.5555, lng: -46.6388 },
    currentOrder: 'Pedido #1234',
    rating: 4.9,
    completedToday: 8
  },
  {
    id: '3',
    name: 'Pedro Costa',
    phone: '(11) 77777-7777',
    status: 'disponivel',
    location: { lat: -23.5485, lng: -46.6280 },
    rating: 4.7,
    completedToday: 15
  },
  {
    id: '4',
    name: 'Ana Oliveira',
    phone: '(11) 66666-6666',
    status: 'ocupado',
    location: { lat: -23.5525, lng: -46.6355 },
    currentOrder: 'Pedido #1235',
    rating: 4.6,
    completedToday: 9
  },
  {
    id: '5',
    name: 'Carlos Ferreira',
    phone: '(11) 55555-5555',
    status: 'offline',
    location: { lat: -23.5470, lng: -46.6410 },
    rating: 4.5,
    completedToday: 0
  }
];

export const DeliveryMap = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>(mockDeliveries);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [filter, setFilter] = useState<'todos' | 'disponivel' | 'ocupado' | 'offline'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter deliveries based on status and search
  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesFilter = filter === 'todos' || delivery.status === filter;
    const matchesSearch = delivery.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getIcon = (status: string) => {
    switch (status) {
      case 'disponivel': return availableIcon;
      case 'ocupado': return busyIcon;
      default: return offlineIcon;
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      disponivel: { label: 'Disponível', className: 'bg-success hover:bg-success' },
      ocupado: { label: 'Ocupado', className: 'bg-warning hover:bg-warning' },
      offline: { label: 'Offline', className: 'bg-secondary hover:bg-secondary' }
    };
    
    const config = configs[status as keyof typeof configs] || configs.offline;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const refreshLocations = async () => {
    setIsRefreshing(true);
    // Simulate API call to refresh locations
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate some movement
    setDeliveries(prev => prev.map(delivery => ({
      ...delivery,
      location: {
        lat: delivery.location.lat + (Math.random() - 0.5) * 0.001,
        lng: delivery.location.lng + (Math.random() - 0.5) * 0.001
      }
    })));
    
    setIsRefreshing(false);
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshLocations, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusCounts = {
    disponivel: deliveries.filter(d => d.status === 'disponivel').length,
    ocupado: deliveries.filter(d => d.status === 'ocupado').length,
    offline: deliveries.filter(d => d.status === 'offline').length
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mapa de Entregadores</h1>
        <p className="text-muted-foreground">
          Localização em tempo real dos entregadores conectados
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar with delivery list */}
        <div className="lg:col-span-1 space-y-4">
          {/* Stats */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Status dos Entregadores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Disponíveis</span>
                <Badge className="bg-success hover:bg-success">{statusCounts.disponivel}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ocupados</span>
                <Badge className="bg-warning hover:bg-warning">{statusCounts.ocupado}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Offline</span>
                <Badge className="bg-secondary hover:bg-secondary">{statusCounts.offline}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Filtros</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshLocations}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="search">Buscar entregador</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Nome do entregador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label>Status</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant={filter === 'todos' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('todos')}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={filter === 'disponivel' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('disponivel')}
                  >
                    Disponível
                  </Button>
                  <Button
                    variant={filter === 'ocupado' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('ocupado')}
                  >
                    Ocupado
                  </Button>
                  <Button
                    variant={filter === 'offline' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('offline')}
                  >
                    Offline
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery List */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Entregadores ({filteredDeliveries.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {filteredDeliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedDelivery?.id === delivery.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedDelivery(delivery)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">{delivery.name}</h4>
                    {getStatusBadge(delivery.status)}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>⭐ {delivery.rating} • {delivery.completedToday} entregas hoje</p>
                    {delivery.currentOrder && (
                      <p className="text-warning">📦 {delivery.currentOrder}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div className="lg:col-span-3">
          <Card className="bg-card border-border h-[600px]">
            <CardContent className="p-0 h-full">
              <MapContainer
                center={[-23.5505, -46.6333]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                className="rounded-lg"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {filteredDeliveries.map((delivery) => (
                  <Marker
                    key={delivery.id}
                    position={[delivery.location.lat, delivery.location.lng]}
                    icon={getIcon(delivery.status)}
                    eventHandlers={{
                      click: () => setSelectedDelivery(delivery)
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-semibold text-foreground">{delivery.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{delivery.phone}</p>
                        <div className="space-y-1">
                          {getStatusBadge(delivery.status)}
                          <p className="text-xs text-muted-foreground">
                            ⭐ {delivery.rating} • {delivery.completedToday} entregas hoje
                          </p>
                          {delivery.currentOrder && (
                            <p className="text-xs text-warning">📦 {delivery.currentOrder}</p>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};