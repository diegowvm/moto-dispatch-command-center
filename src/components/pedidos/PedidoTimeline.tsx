import { usePedidoLogs } from '@/hooks/usePedidoData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Package, User, AlertTriangle, CheckCircle } from 'lucide-react';

interface PedidoTimelineProps {
  pedidoId: string;
}

const getEventIcon = (tipoEvento: string) => {
  switch (tipoEvento) {
    case 'pedido_criado':
      return <Package className="w-4 h-4" />;
    case 'entregador_atribuido':
      return <User className="w-4 h-4" />;
    case 'status_atualizado':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const getEventColor = (tipoEvento: string) => {
  switch (tipoEvento) {
    case 'pedido_criado':
      return 'text-blue-500 bg-blue-50 border-blue-200';
    case 'entregador_atribuido':
      return 'text-green-500 bg-green-50 border-green-200';
    case 'status_atualizado':
      return 'text-orange-500 bg-orange-50 border-orange-200';
    default:
      return 'text-gray-500 bg-gray-50 border-gray-200';
  }
};

export const PedidoTimeline = ({ pedidoId }: PedidoTimelineProps) => {
  const { data: logs, isLoading } = usePedidoLogs(pedidoId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-muted rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhum evento registrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log, index) => (
        <div key={log.id} className="flex gap-3">
          <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${getEventColor(log.tipo_evento)}`}>
            {getEventIcon(log.tipo_evento)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {log.descricao}
              </p>
              <time className="text-xs text-muted-foreground">
                {format(new Date(log.timestamp), 'dd/MM HH:mm', { locale: ptBR })}
              </time>
            </div>
            
            {log.dados_novos && (
              <div className="mt-1 text-xs text-muted-foreground">
                <details className="cursor-pointer">
                  <summary>Ver detalhes</summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(log.dados_novos, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
          
          {/* Linha conectora */}
          {index < logs.length - 1 && (
            <div className="absolute left-[15px] mt-8 w-px h-4 bg-border"></div>
          )}
        </div>
      ))}
    </div>
  );
};