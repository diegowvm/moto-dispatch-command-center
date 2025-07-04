-- ================================================
-- LOGTECH DASHBOARD - ESTRUTURA COMPLETA DO BANCO
-- ================================================

-- Criar enums para tipagem
CREATE TYPE public.tipo_usuario AS ENUM ('admin', 'empresa', 'entregador');
CREATE TYPE public.status_pedido AS ENUM ('recebido', 'enviado', 'a_caminho', 'entregue', 'cancelado');
CREATE TYPE public.status_entregador AS ENUM ('disponivel', 'ocupado', 'offline', 'em_entrega');
CREATE TYPE public.tipo_evento AS ENUM ('pedido_criado', 'entregador_atribuido', 'status_atualizado', 'localização_atualizada', 'mensagem_enviada');

-- ================================================
-- TABELA: USUÁRIOS
-- ================================================
CREATE TABLE public.usuarios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    tipo tipo_usuario NOT NULL,
    status BOOLEAN NOT NULL DEFAULT true,
    telefone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ================================================
-- TABELA: EMPRESAS
-- ================================================
CREATE TABLE public.empresas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nome_fantasia TEXT NOT NULL,
    razao_social TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    endereco TEXT NOT NULL,
    bairro TEXT,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    cep TEXT,
    telefone TEXT,
    contato_responsavel TEXT,
    email_contato TEXT,
    status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ================================================
-- TABELA: ENTREGADORES
-- ================================================
CREATE TABLE public.entregadores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    cpf TEXT NOT NULL UNIQUE,
    cnh TEXT NOT NULL,
    veiculo_tipo TEXT NOT NULL,
    veiculo_placa TEXT NOT NULL,
    veiculo_modelo TEXT,
    veiculo_cor TEXT,
    status status_entregador NOT NULL DEFAULT 'offline',
    avaliacao_media DECIMAL(3,2) DEFAULT 0.0,
    total_entregas INTEGER DEFAULT 0,
    telefone TEXT,
    foto_perfil TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ================================================
-- TABELA: PEDIDOS
-- ================================================
CREATE TABLE public.pedidos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_pedido TEXT NOT NULL UNIQUE DEFAULT CONCAT('PED-', EXTRACT(EPOCH FROM now())::TEXT),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    entregador_id UUID REFERENCES public.entregadores(id) ON DELETE SET NULL,
    status status_pedido NOT NULL DEFAULT 'recebido',
    
    -- Endereços
    endereco_coleta TEXT NOT NULL,
    bairro_coleta TEXT,
    cidade_coleta TEXT NOT NULL,
    cep_coleta TEXT,
    endereco_entrega TEXT NOT NULL,
    bairro_entrega TEXT,
    cidade_entrega TEXT NOT NULL,
    cep_entrega TEXT,
    
    -- Dados do pedido
    descricao_produto TEXT,
    valor_produto DECIMAL(10,2),
    valor_frete DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(10,2) GENERATED ALWAYS AS (COALESCE(valor_produto, 0) + valor_frete) STORED,
    
    -- Contatos
    contato_coleta TEXT,
    telefone_coleta TEXT,
    contato_entrega TEXT,
    telefone_entrega TEXT,
    
    -- Observações
    observacoes TEXT,
    observacoes_entregador TEXT,
    
    -- Timestamps
    data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    data_atribuicao TIMESTAMP WITH TIME ZONE,
    data_saida_coleta TIMESTAMP WITH TIME ZONE,
    data_chegada_entrega TIMESTAMP WITH TIME ZONE,
    data_finalizacao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ================================================
-- TABELA: LOCALIZAÇÃO TEMPO REAL
-- ================================================
CREATE TABLE public.localizacao_tempo_real (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    entregador_id UUID NOT NULL REFERENCES public.entregadores(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    status status_entregador NOT NULL,
    precisao DECIMAL(5,2),
    velocidade DECIMAL(5,2),
    direcao INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Índice único para garantir uma localização por entregador
    UNIQUE(entregador_id)
);

-- ================================================
-- TABELA: MENSAGENS
-- ================================================
CREATE TABLE public.mensagens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_origem_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    usuario_destino_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
    mensagem TEXT NOT NULL,
    anexo_url TEXT,
    status BOOLEAN NOT NULL DEFAULT false, -- false = não lida, true = lida
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    lida_em TIMESTAMP WITH TIME ZONE
);

-- ================================================
-- TABELA: LOGS DO SISTEMA
-- ================================================
CREATE TABLE public.logs_sistema (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    entregador_id UUID REFERENCES public.entregadores(id) ON DELETE SET NULL,
    tipo_evento tipo_evento NOT NULL,
    descricao TEXT NOT NULL,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ================================================
-- HABILITAR ROW LEVEL SECURITY
-- ================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.localizacao_tempo_real ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_sistema ENABLE ROW LEVEL SECURITY;

-- ================================================
-- FUNÇÕES AUXILIARES PARA RLS
-- ================================================

-- Função para obter o tipo de usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS tipo_usuario AS $$
    SELECT tipo FROM public.usuarios WHERE auth_user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Função para obter o ID do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
    SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Função para obter empresa do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_empresa_id()
RETURNS UUID AS $$
    SELECT e.id FROM public.empresas e 
    JOIN public.usuarios u ON e.usuario_id = u.id 
    WHERE u.auth_user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Função para obter entregador do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_entregador_id()
RETURNS UUID AS $$
    SELECT e.id FROM public.entregadores e 
    JOIN public.usuarios u ON e.usuario_id = u.id 
    WHERE u.auth_user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ================================================
-- POLÍTICAS RLS - USUÁRIOS
-- ================================================

-- Admins podem ver todos os usuários
CREATE POLICY "Admins podem ver todos os usuários" ON public.usuarios
    FOR SELECT USING (public.get_current_user_type() = 'admin');

-- Usuários podem ver apenas seus próprios dados
CREATE POLICY "Usuários podem ver seus próprios dados" ON public.usuarios
    FOR SELECT USING (auth_user_id = auth.uid());

-- Admins podem inserir usuários
CREATE POLICY "Admins podem inserir usuários" ON public.usuarios
    FOR INSERT WITH CHECK (public.get_current_user_type() = 'admin');

-- Usuários podem atualizar seus próprios dados
CREATE POLICY "Usuários podem atualizar seus dados" ON public.usuarios
    FOR UPDATE USING (auth_user_id = auth.uid());

-- Admins podem atualizar qualquer usuário
CREATE POLICY "Admins podem atualizar qualquer usuário" ON public.usuarios
    FOR UPDATE USING (public.get_current_user_type() = 'admin');

-- ================================================
-- POLÍTICAS RLS - EMPRESAS
-- ================================================

-- Admins podem ver todas as empresas
CREATE POLICY "Admins podem ver todas as empresas" ON public.empresas
    FOR SELECT USING (public.get_current_user_type() = 'admin');

-- Empresas podem ver apenas seus próprios dados
CREATE POLICY "Empresas podem ver seus dados" ON public.empresas
    FOR SELECT USING (usuario_id = public.get_current_user_id());

-- Admins podem inserir empresas
CREATE POLICY "Admins podem inserir empresas" ON public.empresas
    FOR INSERT WITH CHECK (public.get_current_user_type() = 'admin');

-- Empresas podem atualizar seus dados
CREATE POLICY "Empresas podem atualizar seus dados" ON public.empresas
    FOR UPDATE USING (usuario_id = public.get_current_user_id());

-- ================================================
-- POLÍTICAS RLS - ENTREGADORES
-- ================================================

-- Admins podem ver todos os entregadores
CREATE POLICY "Admins podem ver todos os entregadores" ON public.entregadores
    FOR SELECT USING (public.get_current_user_type() = 'admin');

-- Empresas podem ver entregadores (para seleção)
CREATE POLICY "Empresas podem ver entregadores" ON public.entregadores
    FOR SELECT USING (public.get_current_user_type() = 'empresa');

-- Entregadores podem ver apenas seus dados
CREATE POLICY "Entregadores podem ver seus dados" ON public.entregadores
    FOR SELECT USING (usuario_id = public.get_current_user_id());

-- Admins podem inserir entregadores
CREATE POLICY "Admins podem inserir entregadores" ON public.entregadores
    FOR INSERT WITH CHECK (public.get_current_user_type() = 'admin');

-- Entregadores podem atualizar seus dados
CREATE POLICY "Entregadores podem atualizar seus dados" ON public.entregadores
    FOR UPDATE USING (usuario_id = public.get_current_user_id());

-- Admins podem atualizar entregadores
CREATE POLICY "Admins podem atualizar entregadores" ON public.entregadores
    FOR UPDATE USING (public.get_current_user_type() = 'admin');

-- ================================================
-- POLÍTICAS RLS - PEDIDOS
-- ================================================

-- Admins podem ver todos os pedidos
CREATE POLICY "Admins podem ver todos os pedidos" ON public.pedidos
    FOR SELECT USING (public.get_current_user_type() = 'admin');

-- Empresas podem ver apenas seus pedidos
CREATE POLICY "Empresas podem ver seus pedidos" ON public.pedidos
    FOR SELECT USING (empresa_id = public.get_current_user_empresa_id());

-- Entregadores podem ver pedidos atribuídos a eles
CREATE POLICY "Entregadores podem ver seus pedidos" ON public.pedidos
    FOR SELECT USING (entregador_id = public.get_current_user_entregador_id());

-- Empresas podem criar pedidos
CREATE POLICY "Empresas podem criar pedidos" ON public.pedidos
    FOR INSERT WITH CHECK (empresa_id = public.get_current_user_empresa_id());

-- Admins podem criar pedidos
CREATE POLICY "Admins podem criar pedidos" ON public.pedidos
    FOR INSERT WITH CHECK (public.get_current_user_type() = 'admin');

-- Admins podem atualizar qualquer pedido
CREATE POLICY "Admins podem atualizar pedidos" ON public.pedidos
    FOR UPDATE USING (public.get_current_user_type() = 'admin');

-- Entregadores podem atualizar status dos seus pedidos
CREATE POLICY "Entregadores podem atualizar seus pedidos" ON public.pedidos
    FOR UPDATE USING (entregador_id = public.get_current_user_entregador_id());

-- ================================================
-- POLÍTICAS RLS - LOCALIZAÇÃO TEMPO REAL
-- ================================================

-- Admins podem ver todas as localizações
CREATE POLICY "Admins podem ver todas as localizações" ON public.localizacao_tempo_real
    FOR SELECT USING (public.get_current_user_type() = 'admin');

-- Empresas podem ver localizações dos entregadores com seus pedidos
CREATE POLICY "Empresas podem ver localizações relevantes" ON public.localizacao_tempo_real
    FOR SELECT USING (
        public.get_current_user_type() = 'empresa' AND
        EXISTS (
            SELECT 1 FROM public.pedidos p 
            WHERE p.entregador_id = entregador_id 
            AND p.empresa_id = public.get_current_user_empresa_id()
        )
    );

-- Entregadores podem ver/atualizar apenas sua localização
CREATE POLICY "Entregadores podem gerenciar sua localização" ON public.localizacao_tempo_real
    FOR ALL USING (entregador_id = public.get_current_user_entregador_id());

-- ================================================
-- POLÍTICAS RLS - MENSAGENS
-- ================================================

-- Admins podem ver todas as mensagens
CREATE POLICY "Admins podem ver todas as mensagens" ON public.mensagens
    FOR SELECT USING (public.get_current_user_type() = 'admin');

-- Usuários podem ver mensagens enviadas ou recebidas por eles
CREATE POLICY "Usuários podem ver suas mensagens" ON public.mensagens
    FOR SELECT USING (
        usuario_origem_id = public.get_current_user_id() OR 
        usuario_destino_id = public.get_current_user_id()
    );

-- Usuários podem enviar mensagens
CREATE POLICY "Usuários podem enviar mensagens" ON public.mensagens
    FOR INSERT WITH CHECK (usuario_origem_id = public.get_current_user_id());

-- Usuários podem atualizar status de mensagens recebidas
CREATE POLICY "Usuários podem marcar mensagens como lidas" ON public.mensagens
    FOR UPDATE USING (usuario_destino_id = public.get_current_user_id());

-- ================================================
-- POLÍTICAS RLS - LOGS SISTEMA
-- ================================================

-- Apenas admins podem ver logs
CREATE POLICY "Apenas admins podem ver logs" ON public.logs_sistema
    FOR SELECT USING (public.get_current_user_type() = 'admin');

-- Sistema pode inserir logs (sem restrição para triggers)
CREATE POLICY "Sistema pode inserir logs" ON public.logs_sistema
    FOR INSERT WITH CHECK (true);

-- ================================================
-- TRIGGERS PARA UPDATED_AT
-- ================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para todas as tabelas com updated_at
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entregadores_updated_at BEFORE UPDATE ON public.entregadores
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON public.pedidos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- TRIGGERS PARA LOGS AUTOMÁTICOS
-- ================================================

-- Função para criar logs automáticos
CREATE OR REPLACE FUNCTION public.create_automatic_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.logs_sistema (
            pedido_id,
            usuario_id,
            entregador_id,
            tipo_evento,
            descricao,
            dados_novos
        ) VALUES (
            NEW.id,
            CASE WHEN TG_TABLE_NAME = 'usuarios' THEN NEW.id ELSE NULL END,
            CASE WHEN TG_TABLE_NAME = 'entregadores' THEN NEW.id ELSE NULL END,
            CASE TG_TABLE_NAME
                WHEN 'pedidos' THEN 'pedido_criado'::tipo_evento
                WHEN 'mensagens' THEN 'mensagem_enviada'::tipo_evento
                ELSE 'status_atualizado'::tipo_evento
            END,
            CASE TG_TABLE_NAME
                WHEN 'pedidos' THEN 'Novo pedido criado: ' || NEW.numero_pedido
                WHEN 'mensagens' THEN 'Nova mensagem enviada'
                ELSE 'Registro criado na tabela ' || TG_TABLE_NAME
            END,
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.logs_sistema (
            pedido_id,
            usuario_id,
            entregador_id,
            tipo_evento,
            descricao,
            dados_anteriores,
            dados_novos
        ) VALUES (
            CASE WHEN TG_TABLE_NAME = 'pedidos' THEN NEW.id ELSE NULL END,
            CASE WHEN TG_TABLE_NAME = 'usuarios' THEN NEW.id ELSE NULL END,
            CASE WHEN TG_TABLE_NAME = 'entregadores' THEN NEW.id ELSE NULL END,
            'status_atualizado'::tipo_evento,
            CASE TG_TABLE_NAME
                WHEN 'pedidos' THEN 'Status do pedido ' || NEW.numero_pedido || ' alterado para: ' || NEW.status
                WHEN 'entregadores' THEN 'Status do entregador alterado para: ' || NEW.status
                ELSE 'Registro atualizado na tabela ' || TG_TABLE_NAME
            END,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers de log nas tabelas principais
CREATE TRIGGER log_pedidos_changes AFTER INSERT OR UPDATE ON public.pedidos
    FOR EACH ROW EXECUTE FUNCTION public.create_automatic_log();

CREATE TRIGGER log_entregadores_changes AFTER UPDATE ON public.entregadores
    FOR EACH ROW EXECUTE FUNCTION public.create_automatic_log();

CREATE TRIGGER log_mensagens_changes AFTER INSERT ON public.mensagens
    FOR EACH ROW EXECUTE FUNCTION public.create_automatic_log();

-- ================================================
-- CONFIGURAÇÃO REALTIME
-- ================================================

-- Habilitar realtime para localização
ALTER TABLE public.localizacao_tempo_real REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.localizacao_tempo_real;

-- Habilitar realtime para pedidos
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;

-- Habilitar realtime para mensagens
ALTER TABLE public.mensagens REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens;

-- ================================================
-- ÍNDICES PARA PERFORMANCE
-- ================================================

-- Índices para consultas frequentes
CREATE INDEX idx_usuarios_auth_user_id ON public.usuarios(auth_user_id);
CREATE INDEX idx_usuarios_tipo ON public.usuarios(tipo);
CREATE INDEX idx_empresas_usuario_id ON public.empresas(usuario_id);
CREATE INDEX idx_entregadores_usuario_id ON public.entregadores(usuario_id);
CREATE INDEX idx_entregadores_status ON public.entregadores(status);
CREATE INDEX idx_pedidos_empresa_id ON public.pedidos(empresa_id);
CREATE INDEX idx_pedidos_entregador_id ON public.pedidos(entregador_id);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_data_criacao ON public.pedidos(data_criacao);
CREATE INDEX idx_localizacao_entregador_id ON public.localizacao_tempo_real(entregador_id);
CREATE INDEX idx_localizacao_timestamp ON public.localizacao_tempo_real(timestamp);
CREATE INDEX idx_mensagens_usuario_origem ON public.mensagens(usuario_origem_id);
CREATE INDEX idx_mensagens_usuario_destino ON public.mensagens(usuario_destino_id);
CREATE INDEX idx_mensagens_created_at ON public.mensagens(created_at);
CREATE INDEX idx_logs_pedido_id ON public.logs_sistema(pedido_id);
CREATE INDEX idx_logs_timestamp ON public.logs_sistema(timestamp);

-- ================================================
-- INSERIR USUÁRIO ADMIN PADRÃO
-- ================================================

-- Inserir usuário admin padrão (temporário para testes)
INSERT INTO public.usuarios (
    nome,
    email,
    tipo,
    status
) VALUES (
    'Administrador Logtech',
    'admin@logtech.com.br',
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;