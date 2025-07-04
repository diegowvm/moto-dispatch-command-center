import { useState } from "react";
import { useEntregadores } from "@/hooks/useSupabaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Phone, 
  MessageCircle, 
  MapPin,
  Star,
  Package
} from "lucide-react";

interface Entregador {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  status: 'disponivel' | 'ocupado' | 'offline';
  localizacao: string;
  avaliacao: number;
  entregasHoje: number;
  entregasMes: number;
  tempoOnline: string;
  veiculo: string;
  pedidoAtual?: string;
}

const mockEntregadores: Entregador[] = [
  {
    id: '1',
    nome: 'João Silva',
    telefone: '(11) 99999-9999',
    email: 'joao@email.com',
    status: 'disponivel',
    localizacao: 'Centro, São Paulo',
    avaliacao: 4.8,
    entregasHoje: 12,
    entregasMes: 245,
    tempoOnline: '8h 30m',
    veiculo: 'Moto Honda CB 600'
  },
  {
    id: '2',
    nome: 'Maria Santos',
    telefone: '(11) 88888-8888',
    email: 'maria@email.com',
    status: 'ocupado',
    localizacao: 'Vila Madalena, São Paulo',
    avaliacao: 4.9,
    entregasHoje: 8,
    entregasMes: 198,
    tempoOnline: '6h 15m',
    veiculo: 'Moto Yamaha YBR 125',
    pedidoAtual: 'Pedido #1234 - TechCorp'
  },
  {
    id: '3',
    nome: 'Pedro Costa',
    telefone: '(11) 77777-7777',
    email: 'pedro@email.com',
    status: 'disponivel',
    localizacao: 'Pinheiros, São Paulo',
    avaliacao: 4.7,
    entregasHoje: 15,
    entregasMes: 320,
    tempoOnline: '9h 45m',
    veiculo: 'Moto Honda CG 160'
  },
  {
    id: '4',
    nome: 'Ana Oliveira',
    telefone: '(11) 66666-6666',
    email: 'ana@email.com',
    status: 'ocupado',
    localizacao: 'Itaim Bibi, São Paulo',
    avaliacao: 4.6,
    entregasHoje: 9,
    entregasMes: 156,
    tempoOnline: '5h 20m',
    veiculo: 'Moto Suzuki GSR 125',
    pedidoAtual: 'Pedido #1235 - FastFood Inc'
  },
  {
    id: '5',
    nome: 'Carlos Ferreira',
    telefone: '(11) 55555-5555',
    email: 'carlos@email.com',
    status: 'offline',
    localizacao: 'Moema, São Paulo',
    avaliacao: 4.5,
    entregasHoje: 0,
    entregasMes: 89,
    tempoOnline: '0h 00m',
    veiculo: 'Moto Honda Pop 110'
  }
];

export const Entregadores = () => {
  const { data: entregadoresData, isLoading } = useEntregadores();
  
  // Transformar dados do Supabase para o formato esperado
  const entregadores: Entregador[] = entregadoresData?.map(e => ({
    id: e.id,
    nome: e.usuarios?.nome || 'Nome não informado',
    telefone: e.usuarios?.telefone || 'Telefone não informado',
    email: e.usuarios?.email || 'Email não informado',
    status: e.status as 'disponivel' | 'ocupado' | 'offline',
    localizacao: 'São Paulo, SP', // TODO: Implementar localização real
    avaliacao: e.avaliacao_media || 0,
    entregasHoje: 0, // TODO: Calcular entregas do dia
    entregasMes: e.total_entregas || 0,
    tempoOnline: '0h 00m', // TODO: Calcular tempo online
    veiculo: `${e.veiculo_tipo} ${e.veiculo_modelo || ''} ${e.veiculo_placa}`.trim(),
    pedidoAtual: undefined // TODO: Buscar pedido atual se status for 'ocupado'
  })) || mockEntregadores;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'disponivel' | 'ocupado' | 'offline'>('todos');

  const filteredEntregadores = entregadores.filter(entregador => {
    const matchesSearch = entregador.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entregador.telefone.includes(searchTerm) ||
                         entregador.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'todos' || entregador.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

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

  const statusCounts = {
    total: entregadores.length,
    disponivel: entregadores.filter(e => e.status === 'disponivel').length,
    ocupado: entregadores.filter(e => e.status === 'ocupado').length,
    offline: entregadores.filter(e => e.status === 'offline').length
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Entregadores</h1>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gestão de Entregadores</h1>
        <p className="text-muted-foreground">
          Monitore e gerencie todos os entregadores cadastrados na plataforma
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{statusCounts.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-success"></div>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{statusCounts.disponivel}</p>
                <p className="text-xs text-muted-foreground">Disponíveis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-warning"></div>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{statusCounts.ocupado}</p>
                <p className="text-xs text-muted-foreground">Em Entrega</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-secondary"></div>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{statusCounts.offline}</p>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('todos')}
              >
                Todos
              </Button>
              <Button
                variant={statusFilter === 'disponivel' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('disponivel')}
              >
                Disponíveis
              </Button>
              <Button
                variant={statusFilter === 'ocupado' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('ocupado')}
              >
                Em Entrega
              </Button>
              <Button
                variant={statusFilter === 'offline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('offline')}
              >
                Offline
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entregadores Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">
            Entregadores ({filteredEntregadores.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entregador</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Entregas</TableHead>
                <TableHead>Tempo Online</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntregadores.map((entregador) => (
                <TableRow key={entregador.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {entregador.nome.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-foreground">{entregador.nome}</div>
                        <div className="text-sm text-muted-foreground">{entregador.telefone}</div>
                        <div className="text-xs text-muted-foreground">{entregador.veiculo}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getStatusBadge(entregador.status)}
                      {entregador.pedidoAtual && (
                        <div className="text-xs text-warning">{entregador.pedidoAtual}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{entregador.localizacao}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-warning fill-warning" />
                      <span className="text-sm font-medium text-foreground">{entregador.avaliacao}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {entregador.entregasHoje} hoje
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entregador.entregasMes} este mês
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{entregador.tempoOnline}</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Phone className="h-4 w-4 mr-2" />
                          Ligar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Enviar Mensagem
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MapPin className="h-4 w-4 mr-2" />
                          Ver no Mapa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};