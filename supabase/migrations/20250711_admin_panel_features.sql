-- ===========================
-- MIGRAÇÃO: Funcionalidades do Painel Administrativo
-- Data: 2025-07-11
-- Descrição: Adiciona tabelas e funcionalidades para o painel administrativo
-- ===========================

-- Tabela para termos legais
CREATE TABLE IF NOT EXISTS public.termos_legais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('responsabilidade', 'pagamento', 'entregador')),
    versao TEXT NOT NULL DEFAULT '1.0',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela para controle de envio de termos
CREATE TABLE IF NOT EXISTS public.termos_enviados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    termo_id UUID NOT NULL REFERENCES public.termos_legais(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    entregador_id UUID REFERENCES public.entregadores(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'visualizado', 'aceito', 'rejeitado')),
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_resposta TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_destinatario CHECK (
        (empresa_id IS NOT NULL AND entregador_id IS NULL) OR
        (empresa_id IS NULL AND entregador_id IS NOT NULL)
    )
);

-- Tabela para notificações
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'info' CHECK (tipo IN ('info', 'warning', 'success', 'error')),
    destinatario_tipo TEXT NOT NULL CHECK (destinatario_tipo IN ('empresa', 'entregador', 'todos')),
    destinatario_id UUID,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    entregador_id UUID REFERENCES public.entregadores(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'enviada' CHECK (status IN ('enviada', 'entregue', 'visualizada', 'erro')),
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_entrega TIMESTAMP WITH TIME ZONE,
    data_visualizacao TIMESTAMP WITH TIME ZONE,
    onesignal_id TEXT,
    agendamento TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela para penalidades e avisos
CREATE TABLE IF NOT EXISTS public.penalidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    entregador_id UUID REFERENCES public.entregadores(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('aviso', 'suspensao', 'bloqueio', 'multa')),
    motivo TEXT NOT NULL,
    descricao TEXT,
    valor_multa DECIMAL(10,2),
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN DEFAULT true,
    aplicado_por UUID NOT NULL REFERENCES public.usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela para histórico de alterações de comissão
CREATE TABLE IF NOT EXISTS public.historico_comissoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    porcentagem_anterior DECIMAL(5,2),
    porcentagem_nova DECIMAL(5,2) NOT NULL,
    motivo TEXT NOT NULL,
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN DEFAULT true,
    alterado_por UUID NOT NULL REFERENCES public.usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Atualizar tabela de configurações se não existir
INSERT INTO public.configuracoes (chave, valor, descricao, tipo)
VALUES 
    ('comissao_plataforma', '15.0', 'Porcentagem de comissão da plataforma', 'decimal'),
    ('onesignal_app_id', '2e795a82-c5c0-4fbc-94a5-72f363a36423', 'OneSignal App ID', 'text'),
    ('onesignal_rest_api_key', '', 'OneSignal REST API Key', 'text')
ON CONFLICT (chave) DO NOTHING;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_termos_legais_updated_at BEFORE UPDATE ON public.termos_legais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_termos_enviados_updated_at BEFORE UPDATE ON public.termos_enviados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notificacoes_updated_at BEFORE UPDATE ON public.notificacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_penalidades_updated_at BEFORE UPDATE ON public.penalidades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS para termos_legais
ALTER TABLE public.termos_legais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar termos legais" ON public.termos_legais
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE id = auth.uid() AND tipo = 'admin'
        )
    );

-- Políticas RLS para termos_enviados
ALTER TABLE public.termos_enviados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar termos enviados" ON public.termos_enviados
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE id = auth.uid() AND tipo = 'admin'
        )
    );

CREATE POLICY "Empresas podem ver seus termos" ON public.termos_enviados
    FOR SELECT USING (
        empresa_id IN (
            SELECT id FROM public.empresas 
            WHERE usuario_id = auth.uid()
        )
    );

CREATE POLICY "Entregadores podem ver seus termos" ON public.termos_enviados
    FOR SELECT USING (
        entregador_id IN (
            SELECT id FROM public.entregadores 
            WHERE usuario_id = auth.uid()
        )
    );

-- Políticas RLS para notificacoes
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar notificações" ON public.notificacoes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE id = auth.uid() AND tipo = 'admin'
        )
    );

CREATE POLICY "Empresas podem ver suas notificações" ON public.notificacoes
    FOR SELECT USING (
        destinatario_tipo IN ('todos', 'empresa') AND (
            empresa_id IN (
                SELECT id FROM public.empresas 
                WHERE usuario_id = auth.uid()
            ) OR empresa_id IS NULL
        )
    );

CREATE POLICY "Entregadores podem ver suas notificações" ON public.notificacoes
    FOR SELECT USING (
        destinatario_tipo IN ('todos', 'entregador') AND (
            entregador_id IN (
                SELECT id FROM public.entregadores 
                WHERE usuario_id = auth.uid()
            ) OR entregador_id IS NULL
        )
    );

-- Políticas RLS para penalidades
ALTER TABLE public.penalidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar penalidades" ON public.penalidades
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE id = auth.uid() AND tipo = 'admin'
        )
    );

CREATE POLICY "Usuários podem ver suas penalidades" ON public.penalidades
    FOR SELECT USING (usuario_id = auth.uid());

-- Políticas RLS para historico_comissoes
ALTER TABLE public.historico_comissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar histórico de comissões" ON public.historico_comissoes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE id = auth.uid() AND tipo = 'admin'
        )
    );

-- Função para obter métricas financeiras
CREATE OR REPLACE FUNCTION get_financial_metrics()
RETURNS JSON AS $$
DECLARE
    result JSON;
    receita_total DECIMAL(10,2);
    receita_hoje DECIMAL(10,2);
    receita_mes DECIMAL(10,2);
    comissao_plataforma DECIMAL(10,2);
    valor_entregadores DECIMAL(10,2);
    taxas_pendentes DECIMAL(10,2);
BEGIN
    -- Receita total (pedidos entregues)
    SELECT COALESCE(SUM(valor_total), 0) INTO receita_total
    FROM public.pedidos 
    WHERE status = 'entregue';
    
    -- Receita hoje
    SELECT COALESCE(SUM(valor_total), 0) INTO receita_hoje
    FROM public.pedidos 
    WHERE status = 'entregue' 
    AND DATE(data_finalizacao) = CURRENT_DATE;
    
    -- Receita do mês
    SELECT COALESCE(SUM(valor_total), 0) INTO receita_mes
    FROM public.pedidos 
    WHERE status = 'entregue' 
    AND DATE_TRUNC('month', data_finalizacao) = DATE_TRUNC('month', CURRENT_DATE);
    
    -- Comissão da plataforma
    SELECT COALESCE(SUM(comissao_plataforma), 0) INTO comissao_plataforma
    FROM public.pedidos 
    WHERE status = 'entregue';
    
    -- Valor para entregadores
    SELECT COALESCE(SUM(valor_entregador), 0) INTO valor_entregadores
    FROM public.pedidos 
    WHERE status = 'entregue';
    
    -- Taxas pendentes
    SELECT COALESCE(SUM(valor_total), 0) INTO taxas_pendentes
    FROM public.pedidos 
    WHERE status IN ('recebido', 'enviado', 'a_caminho');
    
    result := json_build_object(
        'receita_total', receita_total,
        'receita_hoje', receita_hoje,
        'receita_mes', receita_mes,
        'comissao_plataforma', comissao_plataforma,
        'valor_entregadores', valor_entregadores,
        'taxas_pendentes', taxas_pendentes,
        'saldos_pagar', valor_entregadores
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar comissão da plataforma
CREATE OR REPLACE FUNCTION update_platform_commission(
    nova_porcentagem DECIMAL(5,2),
    motivo TEXT,
    admin_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    porcentagem_atual DECIMAL(5,2);
BEGIN
    -- Verificar se é admin
    IF NOT EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE id = admin_id AND tipo = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar a comissão';
    END IF;
    
    -- Obter porcentagem atual
    SELECT valor::DECIMAL INTO porcentagem_atual
    FROM public.configuracoes 
    WHERE chave = 'comissao_plataforma';
    
    -- Desativar configuração anterior no histórico
    UPDATE public.historico_comissoes 
    SET ativo = false, data_fim = timezone('utc'::text, now())
    WHERE ativo = true;
    
    -- Inserir novo registro no histórico
    INSERT INTO public.historico_comissoes (
        porcentagem_anterior, 
        porcentagem_nova, 
        motivo, 
        alterado_por
    ) VALUES (
        porcentagem_atual, 
        nova_porcentagem, 
        motivo, 
        admin_id
    );
    
    -- Atualizar configuração
    UPDATE public.configuracoes 
    SET valor = nova_porcentagem::TEXT, updated_at = timezone('utc'::text, now())
    WHERE chave = 'comissao_plataforma';
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_termos_enviados_empresa_id ON public.termos_enviados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_termos_enviados_entregador_id ON public.termos_enviados(entregador_id);
CREATE INDEX IF NOT EXISTS idx_termos_enviados_status ON public.termos_enviados(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario_tipo ON public.notificacoes(destinatario_tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_empresa_id ON public.notificacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_entregador_id ON public.notificacoes(entregador_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON public.notificacoes(status);
CREATE INDEX IF NOT EXISTS idx_penalidades_usuario_id ON public.penalidades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_penalidades_ativo ON public.penalidades(ativo);
CREATE INDEX IF NOT EXISTS idx_historico_comissoes_ativo ON public.historico_comissoes(ativo);

-- Inserir termos legais padrão
INSERT INTO public.termos_legais (titulo, conteudo, tipo, versao) VALUES
(
    'Termo de Responsabilidade para Empresas',
    'Este termo estabelece as responsabilidades das empresas cadastradas na plataforma de logística urbana...',
    'responsabilidade',
    '1.0'
),
(
    'Política de Pagamento',
    'Esta política define as condições de pagamento, prazos e responsabilidades financeiras...',
    'pagamento',
    '1.0'
),
(
    'Termo de Compromisso para Entregadores',
    'Este termo estabelece os compromissos e responsabilidades dos entregadores autônomos...',
    'entregador',
    '1.0'
)
ON CONFLICT DO NOTHING;

