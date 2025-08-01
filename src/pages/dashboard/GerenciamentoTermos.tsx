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
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Send, 
  Eye, 
  Edit, 
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Building
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Termo {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: 'responsabilidade' | 'pagamento' | 'entregador';
  versao: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface TermoEnviado {
  id: string;
  termo_id: string;
  empresa_id?: string;
  entregador_id?: string;
  status: 'enviado' | 'visualizado' | 'aceito' | 'rejeitado';
  data_envio: string;
  data_resposta?: string;
  observacoes?: string;
  termo: Termo;
  empresa?: { nome_fantasia: string };
  entregador?: { usuarios: { nome: string } };
}

const GerenciamentoTermos = () => {
  const [selectedTermo, setSelectedTermo] = useState<Termo | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [novoTermo, setNovoTermo] = useState({
    titulo: '',
    conteudo: '',
    tipo: 'responsabilidade' as const,
    versao: '1.0'
  });
  const [envioTermo, setEnvioTermo] = useState({
    termo_id: '',
    destinatario_tipo: 'empresa' as 'empresa' | 'entregador',
    destinatario_id: '',
    observacoes: ''
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Simular termos - tabela não existe ainda
  const { data: termos = [], isLoading: termosLoading } = useQuery({
    queryKey: ['termos'],
    queryFn: async (): Promise<Termo[]> => {
      // Retornar dados mock até implementar a tabela
      return [
        {
          id: '1',
          titulo: 'Termo de Responsabilidade',
          conteudo: 'Conteúdo do termo de responsabilidade...',
          tipo: 'responsabilidade',
          versao: '1.0',
          ativo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }
  });

  // Simular termos enviados - tabela não existe ainda
  const { data: termosEnviados = [], isLoading: enviadosLoading } = useQuery({
    queryKey: ['termos-enviados'],
    queryFn: async (): Promise<TermoEnviado[]> => {
      // Retornar dados mock até implementar a tabela
      return [];
    }
  });

  // Buscar empresas para envio
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

  // Buscar entregadores para envio
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

  // Simular mutação para criar termo
  const createTermoMutation = useMutation({
    mutationFn: async (termo: typeof novoTermo) => {
      // Simular criação
      return { id: Math.random().toString(), ...termo, ativo: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['termos'] });
      setIsCreateModalOpen(false);
      setNovoTermo({ titulo: '', conteudo: '', tipo: 'responsabilidade', versao: '1.0' });
      toast({
        title: "Termo criado",
        description: "O termo foi criado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar termo",
        description: error.message || "Ocorreu um erro ao criar o termo.",
      });
    }
  });

  // Simular mutação para enviar termo
  const sendTermoMutation = useMutation({
    mutationFn: async (envio: typeof envioTermo) => {
      // Simular envio
      return { 
        id: Math.random().toString(), 
        ...envio,
        status: 'enviado',
        data_envio: new Date().toISOString()
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['termos-enviados'] });
      setIsSendModalOpen(false);
      setEnvioTermo({ termo_id: '', destinatario_tipo: 'empresa', destinatario_id: '', observacoes: '' });
      toast({
        title: "Termo enviado",
        description: "O termo foi enviado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao enviar termo",
        description: error.message || "Ocorreu um erro ao enviar o termo.",
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const configs = {
      enviado: { label: "Enviado", variant: "secondary" as const, icon: Send },
      visualizado: { label: "Visualizado", variant: "default" as const, icon: Eye },
      aceito: { label: "Aceito", variant: "default" as const, icon: CheckCircle },
      rejeitado: { label: "Rejeitado", variant: "destructive" as const, icon: AlertCircle }
    };
    
    const config = configs[status as keyof typeof configs] || configs.enviado;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={
        status === 'aceito' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
        status === 'visualizado' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
        ''
      }>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getTipoBadge = (tipo: string) => {
    const configs = {
      responsabilidade: { label: "Responsabilidade", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100" },
      pagamento: { label: "Pagamento", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
      entregador: { label: "Entregador", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100" }
    };
    
    const config = configs[tipo as keyof typeof configs] || configs.responsabilidade;
    
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const handleCreateTermo = () => {
    if (!novoTermo.titulo.trim() || !novoTermo.conteudo.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Título e conteúdo são obrigatórios.",
      });
      return;
    }

    createTermoMutation.mutate(novoTermo);
  };

  const handleSendTermo = () => {
    if (!envioTermo.termo_id || !envioTermo.destinatario_id) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Selecione o termo e o destinatário.",
      });
      return;
    }

    sendTermoMutation.mutate(envioTermo);
  };

  if (termosLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Termos</h1>
            <p className="text-muted-foreground">Gerencie termos legais e políticas</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando termos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Gerenciamento de Termos
          </h1>
          <p className="text-muted-foreground">Gerencie termos legais e políticas da plataforma</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Termo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Termo</DialogTitle>
                <DialogDescription>
                  Crie um novo termo legal ou política para a plataforma.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={novoTermo.titulo}
                    onChange={(e) => setNovoTermo({ ...novoTermo, titulo: e.target.value })}
                    placeholder="Ex: Termo de Responsabilidade para Empresas"
                  />
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo de Termo</Label>
                  <Select value={novoTermo.tipo} onValueChange={(value: any) => setNovoTermo({ ...novoTermo, tipo: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="responsabilidade">Termo de Responsabilidade</SelectItem>
                      <SelectItem value="pagamento">Política de Pagamento</SelectItem>
                      <SelectItem value="entregador">Termo para Entregadores</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="versao">Versão</Label>
                  <Input
                    id="versao"
                    value={novoTermo.versao}
                    onChange={(e) => setNovoTermo({ ...novoTermo, versao: e.target.value })}
                    placeholder="1.0"
                  />
                </div>
                <div>
                  <Label htmlFor="conteudo">Conteúdo *</Label>
                  <Textarea
                    id="conteudo"
                    value={novoTermo.conteudo}
                    onChange={(e) => setNovoTermo({ ...novoTermo, conteudo: e.target.value })}
                    placeholder="Digite o conteúdo completo do termo..."
                    className="min-h-[200px]"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateTermo}
                    disabled={createTermoMutation.isPending}
                  >
                    {createTermoMutation.isPending ? 'Criando...' : 'Criar Termo'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Enviar Termo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar Termo</DialogTitle>
                <DialogDescription>
                  Envie um termo para uma empresa ou entregador específico.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="termo">Termo</Label>
                  <Select value={envioTermo.termo_id} onValueChange={(value) => setEnvioTermo({ ...envioTermo, termo_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um termo" />
                    </SelectTrigger>
                    <SelectContent>
                      {termos.filter(t => t.ativo).map((termo) => (
                        <SelectItem key={termo.id} value={termo.id}>
                          {termo.titulo} (v{termo.versao})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="destinatario-tipo">Tipo de Destinatário</Label>
                  <Select 
                    value={envioTermo.destinatario_tipo} 
                    onValueChange={(value: any) => setEnvioTermo({ ...envioTermo, destinatario_tipo: value, destinatario_id: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empresa">Empresa</SelectItem>
                      <SelectItem value="entregador">Entregador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="destinatario">Destinatário</Label>
                  <Select value={envioTermo.destinatario_id} onValueChange={(value) => setEnvioTermo({ ...envioTermo, destinatario_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o destinatário" />
                    </SelectTrigger>
                    <SelectContent>
                      {envioTermo.destinatario_tipo === 'empresa' 
                        ? empresas.map((empresa) => (
                            <SelectItem key={empresa.id} value={empresa.id}>
                              {empresa.nome_fantasia}
                            </SelectItem>
                          ))
                        : entregadores.map((entregador) => (
                            <SelectItem key={entregador.id} value={entregador.id}>
                              {entregador.usuarios?.nome}
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={envioTermo.observacoes}
                    onChange={(e) => setEnvioTermo({ ...envioTermo, observacoes: e.target.value })}
                    placeholder="Observações adicionais (opcional)"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsSendModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSendTermo}
                    disabled={sendTermoMutation.isPending}
                  >
                    {sendTermoMutation.isPending ? 'Enviando...' : 'Enviar Termo'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="termos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="termos">Termos Cadastrados</TabsTrigger>
          <TabsTrigger value="enviados">Termos Enviados</TabsTrigger>
          <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="termos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Termos Legais</CardTitle>
              <CardDescription>{termos.length} termos cadastrados</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {termos.map((termo) => (
                    <TableRow key={termo.id}>
                      <TableCell className="font-medium">{termo.titulo}</TableCell>
                      <TableCell>{getTipoBadge(termo.tipo)}</TableCell>
                      <TableCell>v{termo.versao}</TableCell>
                      <TableCell>
                        <Badge variant={termo.ativo ? "default" : "secondary"}>
                          {termo.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(termo.created_at), 'dd/MM/yyyy', { locale: ptBR })}
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

        <TabsContent value="enviados" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Termos Enviados</CardTitle>
              <CardDescription>Histórico de envios e respostas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Termo</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Respondido em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {termosEnviados.map((envio) => (
                    <TableRow key={envio.id}>
                      <TableCell className="font-medium">
                        {envio.termo?.titulo}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {envio.empresa_id ? (
                            <>
                              <Building className="h-4 w-4" />
                              <span>{envio.empresa?.nome_fantasia}</span>
                            </>
                          ) : (
                            <>
                              <Users className="h-4 w-4" />
                              <span>{envio.entregador?.usuarios?.nome}</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(envio.status)}</TableCell>
                      <TableCell>
                        {format(new Date(envio.data_envio), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {envio.data_resposta 
                          ? format(new Date(envio.data_resposta), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          Detalhes
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
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Termos Enviados</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{termosEnviados.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total de envios
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Aceitação</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {termosEnviados.length > 0 
                    ? Math.round((termosEnviados.filter(t => t.status === 'aceito').length / termosEnviados.length) * 100)
                    : 0
                  }%
                </div>
                <p className="text-xs text-muted-foreground">
                  Termos aceitos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {termosEnviados.filter(t => t.status === 'enviado' || t.status === 'visualizado').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Aguardando resposta
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GerenciamentoTermos;

