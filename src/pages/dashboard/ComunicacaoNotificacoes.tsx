import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  Send, 
  Bell, 
  Users, 
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Filter
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'warning' | 'success' | 'error';
  destinatario_tipo: 'empresa' | 'entregador' | 'todos';
  destinatario_id?: string;
  status: 'enviada' | 'entregue' | 'visualizada' | 'erro';
  data_envio: string;
  data_entrega?: string;
  data_visualizacao?: string;
  onesignal_id?: string;
  empresa?: { nome_fantasia: string };
  entregador?: { usuarios: { nome: string } };
}

interface NovaNotificacao {
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'warning' | 'success' | 'error';
  destinatario_tipo: 'empresa' | 'entregador' | 'todos';
  destinatario_ids: string[];
  agendamento?: string;
}

const ComunicacaoNotificacoes = () => {
  const [selectedTab, setSelectedTab] = useState('enviar');
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [novaNotificacao, setNovaNotificacao] = useState<NovaNotificacao>({
    titulo: '',
    mensagem: '',
    tipo: 'info',
    destinatario_tipo: 'todos',
    destinatario_ids: []
  });
  const [filtros, setFiltros] = useState({
    tipo: '',
    status: '',
    destinatario_tipo: ''
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar notificações enviadas - simulado já que não existe a tabela
  const { data: notificacoes = [], isLoading: notificacoesLoading } = useQuery({
    queryKey: ['notificacoes', filtros],
    queryFn: async (): Promise<Notificacao[]> => {
      // Simular dados já que a tabela notificacoes não existe ainda
      const mockNotifications: Notificacao[] = [
        {
          id: '1',
          titulo: 'Sistema Atualizado',
          mensagem: 'O sistema foi atualizado com sucesso.',
          tipo: 'success',
          destinatario_tipo: 'todos',
          status: 'enviada',
          data_envio: new Date().toISOString(),
        },
        {
          id: '2',
          titulo: 'Manutenção Programada',
          mensagem: 'Haverá manutenção programada no sistema.',
          tipo: 'warning',
          destinatario_tipo: 'empresa',
          status: 'entregue',
          data_envio: new Date(Date.now() - 86400000).toISOString(),
        }
      ];
      
      return mockNotifications;
    }
  });

  // Buscar empresas ativas
  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome_fantasia')
        .eq('status', true);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Buscar entregadores ativos
  const { data: entregadores = [] } = useQuery({
    queryKey: ['entregadores-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entregadores')
        .select(`
          id,
          usuarios!inner(nome)
        `);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Mutação para enviar notificação
  const enviarNotificacaoMutation = useMutation({
    mutationFn: async (notificacao: NovaNotificacao) => {
      // Preparar dados para OneSignal
      const oneSignalData = {
        app_id: "2e795a82-c5c0-4fbc-94a5-72f363a36423", // OneSignal App ID
        headings: { "pt": notificacao.titulo },
        contents: { "pt": notificacao.mensagem },
        data: {
          tipo: notificacao.tipo,
          timestamp: new Date().toISOString()
        }
      };

      // Definir destinatários
      if (notificacao.destinatario_tipo === 'todos') {
        (oneSignalData as any).included_segments = ["All"];
      } else {
        // Filtrar por tags específicas
        (oneSignalData as any).filters = [
          { "field": "tag", "key": "user_type", "relation": "=", "value": notificacao.destinatario_tipo }
        ];
        
        if (notificacao.destinatario_ids.length > 0) {
          (oneSignalData as any).filters.push(
            { "operator": "AND" },
            { "field": "tag", "key": "user_id", "relation": "=", "value": notificacao.destinatario_ids.join(",") }
          );
        }
      }

      // Enviar via OneSignal
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic YOUR_REST_API_KEY' // Substituir pela chave real
        },
        body: JSON.stringify(oneSignalData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.errors?.[0] || 'Erro ao enviar notificação');
      }

      // Salvar no banco de dados
      const notificacoesParaSalvar = [];

      if (notificacao.destinatario_tipo === 'todos') {
        notificacoesParaSalvar.push({
          titulo: notificacao.titulo,
          mensagem: notificacao.mensagem,
          tipo: notificacao.tipo,
          destinatario_tipo: 'todos',
          status: 'enviada',
          data_envio: new Date().toISOString(),
          onesignal_id: result.id
        });
      } else {
        // Criar uma notificação para cada destinatário
        for (const destinatarioId of notificacao.destinatario_ids) {
          notificacoesParaSalvar.push({
            titulo: notificacao.titulo,
            mensagem: notificacao.mensagem,
            tipo: notificacao.tipo,
            destinatario_tipo: notificacao.destinatario_tipo,
            destinatario_id: destinatarioId,
            status: 'enviada',
            data_envio: new Date().toISOString(),
            onesignal_id: result.id
          });
        }
      }

      // Simular salvamento já que a tabela não existe
      const data = notificacoesParaSalvar.map((n, i) => ({ ...n, id: `temp_${i}` }));
      const error = null;

      if (error) throw error;
      return { oneSignalResult: result, dbResult: data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      setIsNotificationModalOpen(false);
      setNovaNotificacao({
        titulo: '',
        mensagem: '',
        tipo: 'info',
        destinatario_tipo: 'todos',
        destinatario_ids: []
      });
      toast({
        title: "Notificação enviada",
        description: "A notificação foi enviada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao enviar notificação",
        description: error.message || "Ocorreu um erro ao enviar a notificação.",
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const configs = {
      enviada: { label: "Enviada", variant: "secondary" as const, icon: Send },
      entregue: { label: "Entregue", variant: "default" as const, icon: CheckCircle },
      visualizada: { label: "Visualizada", variant: "default" as const, icon: Eye },
      erro: { label: "Erro", variant: "destructive" as const, icon: AlertTriangle }
    };
    
    const config = configs[status as keyof typeof configs] || configs.enviada;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={
        status === 'entregue' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
        status === 'visualizada' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
        ''
      }>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getTipoBadge = (tipo: string) => {
    const configs = {
      info: { label: "Info", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
      warning: { label: "Aviso", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100" },
      success: { label: "Sucesso", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
      error: { label: "Erro", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" }
    };
    
    const config = configs[tipo as keyof typeof configs] || configs.info;
    
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const handleDestinatarioChange = (destinatarioId: string, checked: boolean) => {
    if (checked) {
      setNovaNotificacao({
        ...novaNotificacao,
        destinatario_ids: [...novaNotificacao.destinatario_ids, destinatarioId]
      });
    } else {
      setNovaNotificacao({
        ...novaNotificacao,
        destinatario_ids: novaNotificacao.destinatario_ids.filter(id => id !== destinatarioId)
      });
    }
  };

  const handleEnviarNotificacao = () => {
    if (!novaNotificacao.titulo.trim() || !novaNotificacao.mensagem.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Título e mensagem são obrigatórios.",
      });
      return;
    }

    if (novaNotificacao.destinatario_tipo !== 'todos' && novaNotificacao.destinatario_ids.length === 0) {
      toast({
        variant: "destructive",
        title: "Destinatários obrigatórios",
        description: "Selecione pelo menos um destinatário.",
      });
      return;
    }

    enviarNotificacaoMutation.mutate(novaNotificacao);
  };

  const destinatarios = novaNotificacao.destinatario_tipo === 'empresa' ? empresas : entregadores;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Comunicação & Notificações
          </h1>
          <p className="text-muted-foreground">Gerencie comunicação com empresas e entregadores</p>
        </div>

        <Dialog open={isNotificationModalOpen} onOpenChange={setIsNotificationModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Nova Notificação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Enviar Notificação</DialogTitle>
              <DialogDescription>
                Envie uma notificação push para empresas ou entregadores.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={novaNotificacao.titulo}
                  onChange={(e) => setNovaNotificacao({ ...novaNotificacao, titulo: e.target.value })}
                  placeholder="Ex: Nova atualização disponível"
                />
              </div>
              <div>
                <Label htmlFor="mensagem">Mensagem *</Label>
                <Textarea
                  id="mensagem"
                  value={novaNotificacao.mensagem}
                  onChange={(e) => setNovaNotificacao({ ...novaNotificacao, mensagem: e.target.value })}
                  placeholder="Digite a mensagem da notificação..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={novaNotificacao.tipo} onValueChange={(value: any) => setNovaNotificacao({ ...novaNotificacao, tipo: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Informação</SelectItem>
                      <SelectItem value="warning">Aviso</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                      <SelectItem value="error">Erro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="destinatario-tipo">Destinatários</Label>
                  <Select 
                    value={novaNotificacao.destinatario_tipo} 
                    onValueChange={(value: any) => setNovaNotificacao({ ...novaNotificacao, destinatario_tipo: value, destinatario_ids: [] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Usuários</SelectItem>
                      <SelectItem value="empresa">Empresas</SelectItem>
                      <SelectItem value="entregador">Entregadores</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {novaNotificacao.destinatario_tipo !== 'todos' && (
                <div>
                  <Label>Selecionar Destinatários</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
                    {destinatarios.map((destinatario) => (
                      <div key={destinatario.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={destinatario.id}
                          checked={novaNotificacao.destinatario_ids.includes(destinatario.id)}
                          onCheckedChange={(checked) => handleDestinatarioChange(destinatario.id, checked as boolean)}
                        />
                        <Label htmlFor={destinatario.id} className="text-sm">
                          {novaNotificacao.destinatario_tipo === 'empresa' 
                            ? (destinatario as any).nome_fantasia 
                            : (destinatario as any).usuarios?.nome
                          }
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsNotificationModalOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleEnviarNotificacao}
                  disabled={enviarNotificacaoMutation.isPending}
                >
                  {enviarNotificacaoMutation.isPending ? 'Enviando...' : 'Enviar Notificação'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="enviar">Enviar Notificação</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="enviar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificações Rápidas</CardTitle>
              <CardDescription>Envie notificações pré-definidas rapidamente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                  onClick={() => {
                    setNovaNotificacao({
                      titulo: "Sistema em Manutenção",
                      mensagem: "O sistema estará em manutenção das 02:00 às 04:00. Pedimos desculpas pelo inconveniente.",
                      tipo: "warning",
                      destinatario_tipo: "todos",
                      destinatario_ids: []
                    });
                    setIsNotificationModalOpen(true);
                  }}
                >
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div className="text-left">
                    <div className="font-medium">Manutenção do Sistema</div>
                    <div className="text-sm text-muted-foreground">Notificar sobre manutenção programada</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                  onClick={() => {
                    setNovaNotificacao({
                      titulo: "Nova Funcionalidade",
                      mensagem: "Uma nova funcionalidade foi adicionada ao sistema. Confira as novidades!",
                      tipo: "success",
                      destinatario_tipo: "todos",
                      destinatario_ids: []
                    });
                    setIsNotificationModalOpen(true);
                  }}
                >
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium">Nova Funcionalidade</div>
                    <div className="text-sm text-muted-foreground">Anunciar novas funcionalidades</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Histórico de Notificações</CardTitle>
                  <CardDescription>{notificacoes.length} notificações enviadas</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={filtros.tipo} onValueChange={(value) => setFiltros({ ...filtros, tipo: value })}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Aviso</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                      <SelectItem value="error">Erro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filtros.status} onValueChange={(value) => setFiltros({ ...filtros, status: value })}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="enviada">Enviada</SelectItem>
                      <SelectItem value="entregue">Entregue</SelectItem>
                      <SelectItem value="visualizada">Visualizada</SelectItem>
                      <SelectItem value="erro">Erro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notificacoes.map((notificacao) => (
                    <TableRow key={notificacao.id}>
                      <TableCell className="font-medium">{notificacao.titulo}</TableCell>
                      <TableCell>{getTipoBadge(notificacao.tipo)}</TableCell>
                      <TableCell>
                        {notificacao.destinatario_tipo === 'todos' ? (
                          <Badge variant="outline">Todos</Badge>
                        ) : (
                          <div className="flex items-center space-x-2">
                            {notificacao.destinatario_tipo === 'empresa' ? (
                              <>
                                <Building className="h-4 w-4" />
                                <span>{notificacao.empresa?.nome_fantasia}</span>
                              </>
                            ) : (
                              <>
                                <Users className="h-4 w-4" />
                                <span>{notificacao.entregador?.usuarios?.nome}</span>
                              </>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(notificacao.status)}</TableCell>
                      <TableCell>
                        {format(new Date(notificacao.data_envio), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estatisticas" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enviadas</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{notificacoes.length}</div>
                <p className="text-xs text-muted-foreground">
                  Todas as notificações
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {notificacoes.length > 0 
                    ? Math.round((notificacoes.filter(n => n.status === 'entregue' || n.status === 'visualizada').length / notificacoes.length) * 100)
                    : 0
                  }%
                </div>
                <p className="text-xs text-muted-foreground">
                  Notificações entregues
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Visualização</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {notificacoes.length > 0 
                    ? Math.round((notificacoes.filter(n => n.status === 'visualizada').length / notificacoes.length) * 100)
                    : 0
                  }%
                </div>
                <p className="text-xs text-muted-foreground">
                  Notificações visualizadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Erros</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {notificacoes.filter(n => n.status === 'erro').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Falhas no envio
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComunicacaoNotificacoes;

