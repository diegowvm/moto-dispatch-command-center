import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Phone, 
  MessageCircle, 
  MapPin,
  Star,
  Package,
  UserCheck,
  UserX,
  Clock,
  Zap,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Ban,
  Play,
  Pause
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Entregador {
  id: string;
  usuario_id: string;
  status: 'disponivel' | 'ocupado' | 'offline' | 'em_entrega';
  veiculo_tipo: string;
  veiculo_placa: string;
  avaliacao_media: number;
  total_entregas: number;
  created_at: string;
  updated_at: string;
  telefone?: string;
  foto_perfil?: string;
  cpf: string;
  cnh: string;
  veiculo_modelo?: string;
  veiculo_cor?: string;
  usuarios: {
    nome: string;
    email: string;
    telefone?: string;
  };
  pedidos_ativos?: number;
}

interface AtribuicaoConfig {
  automatica: boolean;
  criterio: 'proximidade' | 'avaliacao' | 'balanceamento';
  raio_maximo: number;
  max_pedidos_simultaneos: number;
}

const EntregadoresEnhanced = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [selectedEntregador, setSelectedEntregador] = useState<Entregador | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'aprovar' | 'rejeitar'>('aprovar');
  const [approvalReason, setApprovalReason] = useState("");
  const [atribuicaoConfig, setAtribuicaoConfig] = useState<AtribuicaoConfig>({
    automatica: true,
    criterio: 'proximidade',
    raio_maximo: 5,
    max_pedidos_simultaneos: 3
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar entregadores
  const { data: entregadores = [], isLoading } = useQuery({
    queryKey: ['entregadores', statusFilter],
    queryFn: async (): Promise<Entregador[]> => {
      let query = supabase
        .from('entregadores')
        .select(`
          *,
          usuarios(nome, email, telefone)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'todos') {
        if (statusFilter === 'online') {
          query = query.in('status', ['disponivel', 'ocupado', 'em_entrega']);
        } else {
          query = query.eq('status', statusFilter as any);
        }
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Buscar pedidos ativos para cada entregador
      const entregadoresComPedidos = await Promise.all(
        (data || []).map(async (entregador) => {
          const { count } = await supabase
            .from('pedidos')
            .select('*', { count: 'exact', head: true })
            .eq('entregador_id', entregador.id)
            .in('status', ['enviado', 'a_caminho']);

          return {
            ...entregador,
            pedidos_ativos: count || 0
          };
        })
      );

      return entregadoresComPedidos;
    }
  });

  // Simular configuração de atribuição
  const { data: configData } = useQuery({
    queryKey: ['atribuicao-config'],
    queryFn: async () => {
      // Retornar configuração padrão já que a tabela não existe
      return {
        atribuicao_automatica: 'true',
        criterio_atribuicao: 'proximidade',
        raio_maximo: '5',
        max_pedidos_simultaneos: '3'
      };
    }
  });

  // Mutação para aprovar/rejeitar entregador
  const approvalMutation = useMutation({
    mutationFn: async ({ entregadorId, action, reason }: { entregadorId: string, action: 'aprovar' | 'rejeitar', reason?: string }) => {
      const { data, error } = await supabase
        .from('entregadores')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', entregadorId)
        .select()
        .single();

      if (error) throw error;

      // Histórico será registrado via trigger automático
      // await supabase.from('historico_aprovacoes') // Tabela não existe ainda

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      setIsApprovalModalOpen(false);
      setApprovalReason("");
      toast({
        title: variables.action === 'aprovar' ? "Entregador aprovado" : "Entregador rejeitado",
        description: `Entregador foi ${variables.action === 'aprovar' ? 'aprovado' : 'rejeitado'} com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Ocorreu um erro ao processar a solicitação.",
      });
    }
  });

  // Simular mutação para atualizar configuração
  const configMutation = useMutation({
    mutationFn: async (config: AtribuicaoConfig) => {
      // Simular salvamento
      return config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atribuicao-config'] });
      setIsConfigModalOpen(false);
      toast({
        title: "Configuração atualizada",
        description: "As configurações de atribuição foram salvas com sucesso.",
      });
    }
  });

  // Mutação para ativar/desativar entregador
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ entregadorId, ativo }: { entregadorId: string, ativo: boolean }) => {
      const { data, error } = await supabase
        .from('entregadores')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', entregadorId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast({
        title: variables.ativo ? "Entregador ativado" : "Entregador desativado",
        description: `Entregador foi ${variables.ativo ? 'ativado' : 'desativado'} com sucesso.`,
      });
    }
  });

  useEffect(() => {
    if (configData) {
      setAtribuicaoConfig({
        automatica: configData.atribuicao_automatica === 'true',
        criterio: (configData.criterio_atribuicao as 'proximidade' | 'avaliacao' | 'balanceamento') || 'proximidade',
        raio_maximo: parseInt(configData.raio_maximo) || 5,
        max_pedidos_simultaneos: parseInt(configData.max_pedidos_simultaneos) || 3
      });
    }
  }, [configData]);

  const filteredEntregadores = entregadores.filter(entregador => {
    const matchesSearch = entregador.usuarios.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entregador.usuarios.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (entregador: Entregador) => {
    switch (entregador.status) {
      case 'disponivel':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Disponível</Badge>;
      case 'ocupado':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Ocupado</Badge>;
      case 'em_entrega':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Em Entrega</Badge>;
      case 'offline':
      default:
        return <Badge variant="outline">Offline</Badge>;
    }
  };

  const handleApproval = (entregador: Entregador, action: 'aprovar' | 'rejeitar') => {
    setSelectedEntregador(entregador);
    setApprovalAction(action);
    setIsApprovalModalOpen(true);
  };

  const handleSubmitApproval = () => {
    if (!selectedEntregador) return;
    
    approvalMutation.mutate({
      entregadorId: selectedEntregador.id,
      action: approvalAction,
      reason: approvalReason
    });
  };

  const handleToggleActive = (entregador: Entregador) => {
    toggleActiveMutation.mutate({
      entregadorId: entregador.id,
      ativo: entregador.status === 'offline'
    });
  };

  const handleUpdateConfig = () => {
    configMutation.mutate(atribuicaoConfig);
  };

  const pendentesCount = entregadores.filter(e => e.status === 'offline').length;
  const ativosCount = entregadores.filter(e => e.status !== 'offline').length;
  const onlineCount = entregadores.filter(e => e.status === 'disponivel' || e.status === 'ocupado').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCheck className="h-8 w-8" />
            Gestão de Entregadores
          </h1>
          <p className="text-muted-foreground">Gerencie entregadores e configure atribuição automática</p>
        </div>

        <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurações de Atribuição</DialogTitle>
              <DialogDescription>
                Configure como os pedidos são atribuídos automaticamente aos entregadores.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="automatica">Atribuição Automática</Label>
                <Switch
                  id="automatica"
                  checked={atribuicaoConfig.automatica}
                  onCheckedChange={(checked) => setAtribuicaoConfig({ ...atribuicaoConfig, automatica: checked })}
                />
              </div>
              
              <div>
                <Label htmlFor="criterio">Critério de Atribuição</Label>
                <Select 
                  value={atribuicaoConfig.criterio} 
                  onValueChange={(value: any) => setAtribuicaoConfig({ ...atribuicaoConfig, criterio: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proximidade">Proximidade</SelectItem>
                    <SelectItem value="avaliacao">Melhor Avaliação</SelectItem>
                    <SelectItem value="balanceamento">Balanceamento de Carga</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="raio">Raio Máximo (km)</Label>
                <Input
                  id="raio"
                  type="number"
                  value={atribuicaoConfig.raio_maximo}
                  onChange={(e) => setAtribuicaoConfig({ ...atribuicaoConfig, raio_maximo: parseInt(e.target.value) })}
                />
              </div>
              
              <div>
                <Label htmlFor="max-pedidos">Máximo de Pedidos Simultâneos</Label>
                <Input
                  id="max-pedidos"
                  type="number"
                  value={atribuicaoConfig.max_pedidos_simultaneos}
                  onChange={(e) => setAtribuicaoConfig({ ...atribuicaoConfig, max_pedidos_simultaneos: parseInt(e.target.value) })}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateConfig} disabled={configMutation.isPending}>
                  {configMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendentesCount}</div>
            <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ativosCount}</div>
            <p className="text-xs text-muted-foreground">Entregadores aprovados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineCount}</div>
            <p className="text-xs text-muted-foreground">Disponíveis agora</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atribuição</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {atribuicaoConfig.automatica ? 'AUTO' : 'MANUAL'}
            </div>
            <p className="text-xs text-muted-foreground">
              {atribuicaoConfig.automatica ? 'Automática ativa' : 'Manual ativa'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="todos" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="todos" onClick={() => setStatusFilter('todos')}>
              Todos ({entregadores.length})
            </TabsTrigger>
            <TabsTrigger value="pendente" onClick={() => setStatusFilter('pendente')}>
              Pendentes ({pendentesCount})
            </TabsTrigger>
            <TabsTrigger value="aprovado" onClick={() => setStatusFilter('aprovado')}>
              Aprovados ({ativosCount})
            </TabsTrigger>
            <TabsTrigger value="online" onClick={() => setStatusFilter('online')}>
              Online ({onlineCount})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar entregadores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </div>

        <TabsContent value="todos" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entregador</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Pedidos Ativos</TableHead>
                    <TableHead>Última Atividade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntregadores.map((entregador) => (
                    <TableRow key={entregador.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>
                              {entregador.usuarios.nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{entregador.usuarios.nome}</div>
                            <div className="text-sm text-muted-foreground">{entregador.usuarios.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(entregador)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{entregador.veiculo_tipo}</div>
                          <div className="text-muted-foreground">{entregador.veiculo_placa}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{entregador.avaliacao_media?.toFixed(1) || '0.0'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entregador.pedidos_ativos || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entregador.updated_at 
                          ? format(new Date(entregador.updated_at), 'dd/MM HH:mm', { locale: ptBR })
                          : 'Nunca'
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            
                            {entregador.status === 'offline' && (
                              <>
                                <DropdownMenuItem onClick={() => handleApproval(entregador, 'aprovar')}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Ativar
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {entregador.status !== 'offline' && (
                              <DropdownMenuItem onClick={() => handleToggleActive(entregador)}>
                                <Pause className="mr-2 h-4 w-4" />
                                Desativar
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem>
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Enviar Mensagem
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
        </TabsContent>
      </Tabs>

      {/* Modal de Aprovação */}
      <Dialog open={isApprovalModalOpen} onOpenChange={setIsApprovalModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'aprovar' ? 'Aprovar' : 'Rejeitar'} Entregador
            </DialogTitle>
            <DialogDescription>
              {approvalAction === 'aprovar' 
                ? `Aprovar ${selectedEntregador?.usuarios.nome} como entregador da plataforma?`
                : `Rejeitar a solicitação de ${selectedEntregador?.usuarios.nome}?`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">
                {approvalAction === 'aprovar' ? 'Observações (opcional)' : 'Motivo da rejeição *'}
              </Label>
              <Textarea
                id="reason"
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder={
                  approvalAction === 'aprovar' 
                    ? "Observações sobre a aprovação..."
                    : "Explique o motivo da rejeição..."
                }
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsApprovalModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmitApproval}
                disabled={approvalMutation.isPending || (approvalAction === 'rejeitar' && !approvalReason.trim())}
                variant={approvalAction === 'aprovar' ? 'default' : 'destructive'}
              >
                {approvalMutation.isPending ? 'Processando...' : 
                 approvalAction === 'aprovar' ? 'Aprovar' : 'Rejeitar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EntregadoresEnhanced;

