import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';

type Empresa = Tables<'empresas'>;

interface PedidoFiltersProps {
  filters: {
    status: string;
    empresa_id: string;
    search: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  empresas: Empresa[];
}

const statusOptions = [
  { value: 'recebido', label: 'Recebido' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'a_caminho', label: 'A Caminho' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' }
];

export const PedidoFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  empresas
}: PedidoFiltersProps) => {
  const hasActiveFilters = filters.status || filters.empresa_id || filters.search;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 min-w-0">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Número do pedido ou descrição..."
                value={filters.search}
                onChange={(e) => onFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="w-full sm:w-48">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Status
            </label>
            <Select
              value={filters.status}
              onValueChange={(value) => onFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os status</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-48">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Empresa
            </label>
            <Select
              value={filters.empresa_id}
              onValueChange={(value) => onFilterChange('empresa_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as empresas</SelectItem>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nome_fantasia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="whitespace-nowrap"
            >
              <X className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};