import { Badge } from '@/components/ui/badge';
import { Database } from '@/integrations/supabase/types';

type StatusPedido = Database['public']['Enums']['status_pedido'];

interface StatusBadgeProps {
  status: StatusPedido;
}

const statusConfig = {
  recebido: {
    label: 'Recebido',
    variant: 'secondary' as const,
    className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100'
  },
  enviado: {
    label: 'Enviado',
    variant: 'default' as const,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100'
  },
  a_caminho: {
    label: 'A Caminho',
    variant: 'default' as const,
    className: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100'
  },
  entregue: {
    label: 'Entregue',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100'
  },
  cancelado: {
    label: 'Cancelado',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100'
  }
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];

  return (
    <Badge 
      variant={config.variant}
      className={config.className}
    >
      {config.label}
    </Badge>
  );
};