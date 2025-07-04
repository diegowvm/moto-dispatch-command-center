import { useState } from 'react';
import { User, Star, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEntregadoresDisponiveis } from '@/hooks/useEntregadorData';
import { useAtribuirEntregador } from '@/hooks/usePedidoData';
import { Tables } from '@/integrations/supabase/types';

type Entregador = Tables<'entregadores'> & {
  usuarios: Tables<'usuarios'>;
};

interface EntregadorSelectorProps {
  open: boolean;
  onClose: () => void;
  pedidoId: string;
  currentEntregadorId?: string | null;
}

export const EntregadorSelector = ({
  open,
  onClose,
  pedidoId,
  currentEntregadorId
}: EntregadorSelectorProps) => {
  const [selectedEntregador, setSelectedEntregador] = useState<string>('');
  
  const { data: entregadores, isLoading } = useEntregadoresDisponiveis();
  const atribuirMutation = useAtribuirEntregador();

  const handleAtribuir = async () => {
    if (!selectedEntregador) return;

    try {
      await atribuirMutation.mutateAsync({
        pedidoId,
        entregadorId: selectedEntregador
      });
      onClose();
    } catch (error) {
      // Error handled by the mutation
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      disponivel: { label: 'Disponível', className: 'bg-green-100 text-green-800' },
      ocupado: { label: 'Ocupado', className: 'bg-yellow-100 text-yellow-800' },
      offline: { label: 'Offline', className: 'bg-gray-100 text-gray-800' },
      em_entrega: { label: 'Em Entrega', className: 'bg-blue-100 text-blue-800' }
    };

    const statusConfig = config[status as keyof typeof config] || config.offline;

    return (
      <Badge className={statusConfig.className}>
        {statusConfig.label}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Selecionar Entregador</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {entregadores?.map((entregador: Entregador) => (
                <div
                  key={entregador.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedEntregador === entregador.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedEntregador(entregador.id)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={entregador.foto_perfil || undefined} />
                      <AvatarFallback>
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">
                          {entregador.usuarios.nome}
                        </h3>
                        {getStatusBadge(entregador.status)}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {entregador.avaliacao_media && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>{entregador.avaliacao_media.toFixed(1)}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{entregador.total_entregas || 0} entregas</span>
                        </div>

                        {entregador.veiculo_tipo && (
                          <div>
                            <span>{entregador.veiculo_tipo}</span>
                            {entregador.veiculo_placa && (
                              <span className="ml-1 text-xs">
                                ({entregador.veiculo_placa})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {currentEntregadorId === entregador.id && (
                      <Badge variant="secondary">Atual</Badge>
                    )}
                  </div>
                </div>
              ))}

              {(!entregadores || entregadores.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum entregador disponível no momento</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleAtribuir}
            disabled={!selectedEntregador || atribuirMutation.isPending}
          >
            {atribuirMutation.isPending ? 'Atribuindo...' : 'Atribuir Entregador'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};