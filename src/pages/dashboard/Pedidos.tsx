import { useState } from 'react';
import { Plus, Search, Filter, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePedidos, useEmpresas } from '@/hooks/useSupabaseData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/pedidos/StatusBadge';
import { PedidoFilters } from '@/components/pedidos/PedidoFilters';

export const Pedidos = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: '',
    empresa_id: '',
    search: ''
  });

  const { data: pedidos, isLoading } = usePedidos({
    status: filters.status || undefined,
    empresa_id: filters.empresa_id || undefined,
    search: filters.search || undefined
  });

  const { data: empresas } = useEmpresas();

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: '', empresa_id: '', search: '' });
  };

  const formatValue = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground">Gerencie todos os pedidos do sistema</p>
        </div>
        <Button onClick={() => navigate('/dashboard/pedidos/novo')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Pedido
        </Button>
      </div>

      <PedidoFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        empresas={empresas || []}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Entregador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos?.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-medium">
                      {pedido.numero_pedido}
                    </TableCell>
                    <TableCell>
                      {pedido.empresas?.nome_fantasia || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {pedido.entregadores?.usuarios?.nome || 'Não atribuído'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={pedido.status} />
                    </TableCell>
                    <TableCell>
                      {formatValue(pedido.valor_total)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(pedido.created_at), 'dd/MM/yyyy HH:mm', {
                        locale: ptBR
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/dashboard/pedidos/${pedido.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {(!pedidos || pedidos.length === 0) && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum pedido encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};