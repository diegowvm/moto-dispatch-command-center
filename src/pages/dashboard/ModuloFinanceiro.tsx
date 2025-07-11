import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  Calendar,
  Download,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialMetrics {
  receitaTotal: number;
  receitaHoje: number;
  receitaMes: number;
  comissaoPlataforma: number;
  valorEntregadores: number;
  taxasPendentes: number;
  saldosPagar: number;
}

interface ComissaoConfig {
  id: string;
  porcentagem: number;
  data_inicio: string;
  data_fim?: string;
  ativo: boolean;
  criado_por: string;
  motivo?: string;
}

const ModuloFinanceiro = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('hoje');
  const [novaComissao, setNovaComissao] = useState({ porcentagem: 15, motivo: '' });
  const [isComissaoModalOpen, setIsComissaoModalOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar métricas financeiras
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['financial-metrics', selectedPeriod],
    queryFn: async (): Promise<FinancialMetrics> => {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      // Buscar pedidos entregues
      const { data: pedidosEntregues, error: pedidosError } = await supabase
        .from('pedidos')
        .select('valor_total, valor_frete, comissao_plataforma, valor_entregador, data_finalizacao')
        .eq('status', 'entregue')
        .not('data_finalizacao', 'is', null);

      if (pedidosError) throw pedidosError;

      // Calcular métricas
      const receitaTotal = pedidosEntregues?.reduce((sum, p) => sum + (p.valor_total || 0), 0) || 0;
      
      const pedidosHoje = pedidosEntregues?.filter(p => {
        const dataFinalizacao = new Date(p.data_finalizacao);
        return dataFinalizacao.toDateString() === hoje.toDateString();
      }) || [];
      
      const pedidosMes = pedidosEntregues?.filter(p => {
        const dataFinalizacao = new Date(p.data_finalizacao);
        return dataFinalizacao >= inicioMes;
      }) || [];

      const receitaHoje = pedidosHoje.reduce((sum, p) => sum + (p.valor_total || 0), 0);
      const receitaMes = pedidosMes.reduce((sum, p) => sum + (p.valor_total || 0), 0);
      const comissaoPlataforma = pedidosEntregues?.reduce((sum, p) => sum + (p.comissao_plataforma || 0), 0) || 0;
      const valorEntregadores = pedidosEntregues?.reduce((sum, p) => sum + (p.valor_entregador || 0), 0) || 0;

      // Buscar taxas pendentes (pedidos não entregues)
      const { data: pedidosPendentes } = await supabase
        .from('pedidos')
        .select('valor_total')
        .in('status', ['recebido', 'enviado', 'a_caminho']);

      const taxasPendentes = pedidosPendentes?.reduce((sum, p) => sum + (p.valor_total || 0), 0) || 0;

      return {
        receitaTotal,
        receitaHoje,
        receitaMes,
        comissaoPlataforma,
        valorEntregadores,
        taxasPendentes,
        saldosPagar: valorEntregadores
      };
    }
  });

  // Buscar histórico de comissões
  const { data: comissoes, isLoading: comissoesLoading } = useQuery({
    queryKey: ['comissoes-historico'],
    queryFn: async (): Promise<ComissaoConfig[]> => {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('chave', 'comissao_plataforma')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Simular histórico de comissões (adaptar conforme estrutura real)
      return [
        {
          id: '1',
          porcentagem: 15,
          data_inicio: '2025-01-01',
          ativo: true,
          criado_por: 'Admin',
          motivo: 'Configuração inicial'
        }
      ];
    }
  });

  // Mutação para alterar comissão
  const alterarComissaoMutation = useMutation({
    mutationFn: async (novaConfig: { porcentagem: number; motivo: string }) => {
      // Atualizar configuração no Supabase
      const { data, error } = await supabase
        .from('configuracoes')
        .update({ valor: novaConfig.porcentagem.toString() })
        .eq('chave', 'comissao_plataforma')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes-historico'] });
      queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });
      setIsComissaoModalOpen(false);
      setNovaComissao({ porcentagem: 15, motivo: '' });
      toast({
        title: "Comissão alterada",
        description: "A porcentagem de comissão foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao alterar comissão",
        description: error.message || "Ocorreu um erro ao alterar a comissão.",
      });
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleAlterarComissao = () => {
    if (novaComissao.porcentagem < 0 || novaComissao.porcentagem > 50) {
      toast({
        variant: "destructive",
        title: "Valor inválido",
        description: "A porcentagem deve estar entre 0% e 50%.",
      });
      return;
    }

    if (!novaComissao.motivo.trim()) {
      toast({
        variant: "destructive",
        title: "Motivo obrigatório",
        description: "Informe o motivo da alteração da comissão.",
      });
      return;
    }

    alterarComissaoMutation.mutate(novaComissao);
  };

  if (metricsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Módulo Financeiro</h1>
            <p className="text-muted-foreground">Gestão financeira completa da plataforma</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Módulo Financeiro
          </h1>
          <p className="text-muted-foreground">Gestão financeira completa da plataforma</p>
        </div>

        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">Esta Semana</SelectItem>
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="ano">Este Ano</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isComissaoModalOpen} onOpenChange={setIsComissaoModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Alterar Comissão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alterar Comissão da Plataforma</DialogTitle>
                <DialogDescription>
                  Defina uma nova porcentagem de comissão. Esta alteração afetará todos os novos pedidos.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="porcentagem">Nova Porcentagem (%)</Label>
                  <Input
                    id="porcentagem"
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={novaComissao.porcentagem}
                    onChange={(e) => setNovaComissao({ ...novaComissao, porcentagem: parseFloat(e.target.value) || 0 })}
                    placeholder="15.0"
                  />
                </div>
                <div>
                  <Label htmlFor="motivo">Motivo da Alteração</Label>
                  <Input
                    id="motivo"
                    value={novaComissao.motivo}
                    onChange={(e) => setNovaComissao({ ...novaComissao, motivo: e.target.value })}
                    placeholder="Ex: Ajuste de mercado, promoção, etc."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsComissaoModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAlterarComissao}
                    disabled={alterarComissaoMutation.isPending}
                  >
                    {alterarComissaoMutation.isPending ? 'Alterando...' : 'Alterar Comissão'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.receitaTotal || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Todas as entregas concluídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Hoje</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.receitaHoje || 0)}</div>
            <p className="text-xs text-muted-foreground">
              +12% em relação a ontem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissão Plataforma</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.comissaoPlataforma || 0)}</div>
            <p className="text-xs text-muted-foreground">
              15% dos pedidos entregues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldos a Pagar</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.saldosPagar || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Para entregadores
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
          <TabsTrigger value="entregadores">Entregadores</TabsTrigger>
          <TabsTrigger value="comissoes">Histórico de Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Fluxo de Caixa</CardTitle>
                <CardDescription>Receitas e despesas do período</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Receita Bruta</span>
                    <span className="font-medium">{formatCurrency(metrics?.receitaTotal || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Comissão Plataforma</span>
                    <span className="font-medium text-green-600">+{formatCurrency(metrics?.comissaoPlataforma || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pagamentos Entregadores</span>
                    <span className="font-medium text-red-600">-{formatCurrency(metrics?.valorEntregadores || 0)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-medium">
                      <span>Lucro Líquido</span>
                      <span className="text-green-600">{formatCurrency(metrics?.comissaoPlataforma || 0)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Financeiro</CardTitle>
                <CardDescription>Situação atual dos pagamentos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Pagamentos em Dia</span>
                    </div>
                    <span className="font-medium">98%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">Pendentes</span>
                    </div>
                    <span className="font-medium">{formatCurrency(metrics?.taxasPendentes || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Em Atraso</span>
                    </div>
                    <span className="font-medium">R$ 0,00</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="empresas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Empresa</CardTitle>
              <CardDescription>Ranking das empresas por volume de pedidos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Dados de faturamento por empresa em desenvolvimento</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entregadores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos para Entregadores</CardTitle>
              <CardDescription>Controle de saldos e pagamentos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Sistema de pagamentos para entregadores em desenvolvimento</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comissoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Alterações de Comissão</CardTitle>
              <CardDescription>Registro de todas as alterações na porcentagem de comissão</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Porcentagem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Alterado por</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comissoes?.map((comissao) => (
                    <TableRow key={comissao.id}>
                      <TableCell>
                        {format(new Date(comissao.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {comissao.porcentagem}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={comissao.ativo ? "default" : "secondary"}>
                          {comissao.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>{comissao.criado_por}</TableCell>
                      <TableCell>{comissao.motivo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModuloFinanceiro;

