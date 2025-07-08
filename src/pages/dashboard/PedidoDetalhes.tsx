import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, MapPin, Package, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePedidoById } from '@/hooks/usePedidoData';
import { StatusBadge } from '@/components/pedidos/StatusBadge';
import { EntregadorSelector } from '@/components/pedidos/EntregadorSelector';
import { PedidoTimeline } from '@/components/pedidos/PedidoTimeline';
import { StatusManager } from '@/components/pedidos/StatusManager';
import { LazyPedidoMap } from '@/components/map/LazyPedidoMap';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PedidoDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showEntregadorSelector, setShowEntregadorSelector] = useState(false);
  const [showStatusManager, setShowStatusManager] = useState(false);

  const { data: pedido, isLoading, error } = usePedidoById(id!);

  const formatValue = (value: number | null) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Pedido não encontrado
          </h2>
          <p className="text-muted-foreground mb-4">
            O pedido que você está procurando não existe ou foi removido.
          </p>
          <Button onClick={() => navigate('/dashboard/pedidos')}>
            Voltar para Pedidos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard/pedidos')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">
            Pedido {pedido.numero_pedido}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <StatusBadge status={pedido.status} />
            <span className="text-sm text-muted-foreground">
              Criado em {formatDate(pedido.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados do Pedido */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Dados do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Número do Pedido
                  </label>
                  <p className="text-foreground font-medium">{pedido.numero_pedido}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Empresa
                  </label>
                  <p className="text-foreground">{pedido.empresas?.nome_fantasia}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Entregador
                  </label>
                  <p className="text-foreground">
                    {pedido.entregadores?.usuarios?.nome || 'Não atribuído'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="mt-1">
                    <StatusBadge status={pedido.status} />
                  </div>
                </div>
              </div>

              {pedido.descricao_produto && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Descrição do Produto
                  </label>
                  <p className="text-foreground">{pedido.descricao_produto}</p>
                </div>
              )}

              {pedido.observacoes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Observações
                  </label>
                  <p className="text-foreground">{pedido.observacoes}</p>
                </div>
              )}

              {pedido.observacoes_entregador && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Observações do Entregador
                  </label>
                  <p className="text-foreground">{pedido.observacoes_entregador}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Endereços */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Endereços
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Coleta */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Coleta</h4>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">{pedido.endereco_coleta}</span>
                    </p>
                    {pedido.bairro_coleta && (
                      <p className="text-sm text-muted-foreground">
                        {pedido.bairro_coleta}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {pedido.cidade_coleta}
                    </p>
                    {pedido.cep_coleta && (
                      <p className="text-sm text-muted-foreground">
                        CEP: {pedido.cep_coleta}
                      </p>
                    )}
                    {pedido.contato_coleta && (
                      <p className="text-sm">
                        <span className="font-medium">Contato:</span> {pedido.contato_coleta}
                      </p>
                    )}
                    {pedido.telefone_coleta && (
                      <p className="text-sm">
                        <span className="font-medium">Telefone:</span> {pedido.telefone_coleta}
                      </p>
                    )}
                  </div>
                </div>

                {/* Entrega */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Entrega</h4>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">{pedido.endereco_entrega}</span>
                    </p>
                    {pedido.bairro_entrega && (
                      <p className="text-sm text-muted-foreground">
                        {pedido.bairro_entrega}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {pedido.cidade_entrega}
                    </p>
                    {pedido.cep_entrega && (
                      <p className="text-sm text-muted-foreground">
                        CEP: {pedido.cep_entrega}
                      </p>
                    )}
                    {pedido.contato_entrega && (
                      <p className="text-sm">
                        <span className="font-medium">Contato:</span> {pedido.contato_entrega}
                      </p>
                    )}
                    {pedido.telefone_entrega && (
                      <p className="text-sm">
                        <span className="font-medium">Telefone:</span> {pedido.telefone_entrega}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mapa do Pedido */}
          <LazyPedidoMap
            enderecoColeta={pedido.endereco_coleta}
            enderecoEntrega={pedido.endereco_entrega}
            cidadeColeta={pedido.cidade_coleta}
            cidadeEntrega={pedido.cidade_entrega}
          />

          {/* Valores */}
          <Card>
            <CardHeader>
              <CardTitle>Valores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor do Produto:</span>
                  <span className="font-medium">{formatValue(pedido.valor_produto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor do Frete:</span>
                  <span className="font-medium">{formatValue(pedido.valor_frete)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>{formatValue(pedido.valor_total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações e Timeline */}
        <div className="space-y-6">
          {/* Ações */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setShowEntregadorSelector(true)}
                disabled={pedido.status === 'entregue' || pedido.status === 'cancelado'}
              >
                <User className="w-4 h-4 mr-2" />
                {pedido.entregador_id ? 'Alterar Entregador' : 'Atribuir Entregador'}
              </Button>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => setShowStatusManager(true)}
                disabled={pedido.status === 'entregue' || pedido.status === 'cancelado'}
              >
                <Clock className="w-4 h-4 mr-2" />
                Alterar Status
              </Button>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PedidoTimeline pedidoId={pedido.id} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {showEntregadorSelector && (
        <EntregadorSelector
          open={showEntregadorSelector}
          onClose={() => setShowEntregadorSelector(false)}
          pedidoId={pedido.id}
          currentEntregadorId={pedido.entregador_id}
        />
      )}

      {showStatusManager && (
        <StatusManager
          open={showStatusManager}
          onClose={() => setShowStatusManager(false)}
          pedido={pedido}
        />
      )}
    </div>
  );
};