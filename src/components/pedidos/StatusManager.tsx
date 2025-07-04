import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Package, Truck, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdatePedidoStatus } from '@/hooks/useSupabaseData';
import { useCancelarPedido } from '@/hooks/usePedidoData';
import { Tables } from '@/integrations/supabase/types';

type Pedido = Tables<'pedidos'>;
type StatusPedido = Pedido['status'];

interface StatusManagerProps {
  open: boolean;
  onClose: () => void;
  pedido: Pedido;
}

const statusTransitions = {
  recebido: [
    { status: 'enviado', label: 'Marcar como Enviado', icon: Package, color: 'bg-yellow-500' }
  ],
  enviado: [
    { status: 'a_caminho', label: 'Marcar como A Caminho', icon: Truck, color: 'bg-orange-500' }
  ],
  a_caminho: [
    { status: 'entregue', label: 'Marcar como Entregue', icon: CheckCircle, color: 'bg-green-500' }
  ],
  entregue: [],
  cancelado: []
};

export const StatusManager = ({ open, onClose, pedido }: StatusManagerProps) => {
  const [selectedStatus, setSelectedStatus] = useState<StatusPedido | null>(null);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [motivo, setMotivo] = useState('');

  const updateStatusMutation = useUpdatePedidoStatus();
  const cancelarMutation = useCancelarPedido();

  const availableTransitions = statusTransitions[pedido.status] || [];

  const handleStatusUpdate = async (newStatus: StatusPedido) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: pedido.id,
        status: newStatus
      });
      onClose();
    } catch (error) {
      // Error handled by the mutation
    }
  };

  const handleCancel = async () => {
    if (!motivo.trim()) return;

    try {
      await cancelarMutation.mutateAsync({
        pedidoId: pedido.id,
        motivo: motivo.trim()
      });
      onClose();
    } catch (error) {
      // Error handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Alterar Status do Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showCancelForm ? (
            <>
              {/* Transições disponíveis */}
              {availableTransitions.length > 0 && (
                <div className="space-y-3">
                  <Label>Próximos Status Disponíveis:</Label>
                  {availableTransitions.map((transition) => {
                    const IconComponent = transition.icon;
                    return (
                      <Button
                        key={transition.status}
                        variant="outline"
                        className="w-full justify-start h-auto p-4"
                        onClick={() => handleStatusUpdate(transition.status)}
                        disabled={updateStatusMutation.isPending}
                      >
                        <div className={`w-8 h-8 rounded-full ${transition.color} flex items-center justify-center mr-3`}>
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{transition.label}</div>
                          <div className="text-sm text-muted-foreground">
                            Atualizar status do pedido
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* Cancelar pedido */}
              {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setShowCancelForm(true)}
                  >
                    <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center mr-3">
                      <X className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Cancelar Pedido</div>
                      <div className="text-sm opacity-70">
                        Marcar pedido como cancelado
                      </div>
                    </div>
                  </Button>
                </div>
              )}

              {availableTransitions.length === 0 && pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
                <div className="text-center py-6 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma transição disponível no momento</p>
                </div>
              )}

              {(pedido.status === 'entregue' || pedido.status === 'cancelado') && (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    Este pedido já foi {pedido.status === 'entregue' ? 'entregue' : 'cancelado'}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Formulário de cancelamento */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Cancelar Pedido</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
                <Textarea
                  id="motivo"
                  placeholder="Digite o motivo do cancelamento..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelForm(false)}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={!motivo.trim() || cancelarMutation.isPending}
                  className="flex-1"
                >
                  {cancelarMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {!showCancelForm && (
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};