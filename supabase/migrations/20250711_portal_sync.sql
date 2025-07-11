-- ===========================
-- MIGRAÇÃO: Portal Setup
-- Data: 2025-07-11
-- Descrição: Configuração inicial do banco de dados para o portal de empresas
-- ===========================

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================
-- TABELAS PRINCIPAIS
-- ===========================

-- Tabela de usuários (base para autenticação)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    tipo VARCHAR(20) DEFAULT 'empresa' CHECK (tipo IN ('admin', 'empresa', 'entregador')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de empresas
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nome_fantasia VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18),
    endereco TEXT NOT NULL,
    bairro VARCHAR(100),
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    cep VARCHAR(10),
    telefone VARCHAR(20),
    email_contato VARCHAR(255),
    contato_responsavel VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de entregadores
CREATE TABLE IF NOT EXISTS public.entregadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    cpf VARCHAR(14) UNIQUE,
    data_nascimento DATE,
    endereco TEXT,
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    banco VARCHAR(100),
    agencia VARCHAR(10),
    conta VARCHAR(20),
    pix VARCHAR(255),
    veiculo_tipo VARCHAR(50),
    veiculo_placa VARCHAR(10),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'blocked')),
    disponivel BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_pedido VARCHAR(20) UNIQUE NOT NULL,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    entregador_id UUID REFERENCES public.entregadores(id) ON DELETE SET NULL,
    
    -- Dados da coleta
    endereco_coleta TEXT NOT NULL,
    bairro_coleta VARCHAR(100),
    cidade_coleta VARCHAR(100) NOT NULL,
    cep_coleta VARCHAR(10),
    contato_coleta VARCHAR(255),
    telefone_coleta VARCHAR(20),
    
    -- Dados da entrega
    endereco_entrega TEXT NOT NULL,
    bairro_entrega VARCHAR(100),
    cidade_entrega VARCHAR(100) NOT NULL,
    cep_entrega VARCHAR(10),
    contato_entrega VARCHAR(255),
    telefone_entrega VARCHAR(20),
    
    -- Dados do produto
    descricao_produto TEXT,
    valor_produto DECIMAL(10,2),
    observacoes TEXT,
    
    -- Dados financeiros
    valor_frete DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(10,2),
    comissao_plataforma DECIMAL(10,2),
    valor_entregador DECIMAL(10,2),
    
    -- Dados de rota
    distancia_km DECIMAL(8,2),
    tempo_estimado_minutos INTEGER,
    
    -- Status e datas
    status VARCHAR(20) DEFAULT 'recebido' CHECK (status IN ('recebido', 'enviado', 'a_caminho', 'entregue', 'cancelado')),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atribuicao TIMESTAMP WITH TIME ZONE,
    data_coleta TIMESTAMP WITH TIME ZONE,
    data_entrega TIMESTAMP WITH TIME ZONE,
    data_finalizacao TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de localizações em tempo real
CREATE TABLE IF NOT EXISTS public.localizacao_tempo_real (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entregador_id UUID REFERENCES public.entregadores(id) ON DELETE CASCADE,
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    precisao DECIMAL(8,2),
    velocidade DECIMAL(8,2),
    direcao DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de configurações da plataforma
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descricao TEXT,
    tipo VARCHAR(20) DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================
-- TRIGGERS E FUNÇÕES
-- ===========================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entregadores_updated_at BEFORE UPDATE ON public.entregadores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_configuracoes_updated_at BEFORE UPDATE ON public.configuracoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar número do pedido
CREATE OR REPLACE FUNCTION generate_numero_pedido()
RETURNS TRIGGER AS $$
BEGIN
    NEW.numero_pedido = 'PED' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 6, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para gerar número do pedido
CREATE TRIGGER generate_pedido_numero BEFORE INSERT ON public.pedidos FOR EACH ROW EXECUTE FUNCTION generate_numero_pedido();

-- Função para criar usuário automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (auth_user_id, nome, email, tipo)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
        NEW.email,
        'empresa'
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger para criar usuário automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================
-- ÍNDICES PARA PERFORMANCE
-- ===========================

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_user_id ON public.usuarios(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo_status ON public.usuarios(tipo, status);

-- Índices para empresas
CREATE INDEX IF NOT EXISTS idx_empresas_usuario_id ON public.empresas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_empresas_status ON public.empresas(status);
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON public.empresas(cnpj);

-- Índices para entregadores
CREATE INDEX IF NOT EXISTS idx_entregadores_usuario_id ON public.entregadores(usuario_id);
CREATE INDEX IF NOT EXISTS idx_entregadores_status ON public.entregadores(status);
CREATE INDEX IF NOT EXISTS idx_entregadores_disponivel ON public.entregadores(disponivel);
CREATE INDEX IF NOT EXISTS idx_entregadores_cpf ON public.entregadores(cpf);

-- Índices para pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_id ON public.pedidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_entregador_id ON public.pedidos(entregador_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON public.pedidos(numero_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_data_criacao ON public.pedidos(data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_composite ON public.pedidos(empresa_id, status, data_criacao DESC);

-- Índices para localizações
CREATE INDEX IF NOT EXISTS idx_localizacao_entregador_id ON public.localizacao_tempo_real(entregador_id);
CREATE INDEX IF NOT EXISTS idx_localizacao_pedido_id ON public.localizacao_tempo_real(pedido_id);
CREATE INDEX IF NOT EXISTS idx_localizacao_timestamp ON public.localizacao_tempo_real(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_localizacao_composite ON public.localizacao_tempo_real(entregador_id, status, timestamp DESC);

-- ===========================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ===========================

-- Habilitar RLS nas tabelas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.localizacao_tempo_real ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios
CREATE POLICY "Usuários podem ver seus próprios dados" ON public.usuarios
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Usuários podem atualizar seus próprios dados" ON public.usuarios
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- Políticas para empresas
CREATE POLICY "Empresas podem ver seus próprios dados" ON public.empresas
    FOR SELECT USING (
        usuario_id IN (
            SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Empresas podem atualizar seus próprios dados" ON public.empresas
    FOR UPDATE USING (
        usuario_id IN (
            SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Empresas podem inserir seus próprios dados" ON public.empresas
    FOR INSERT WITH CHECK (
        usuario_id IN (
            SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
        )
    );

-- Políticas para pedidos
CREATE POLICY "Empresas podem ver seus próprios pedidos" ON public.pedidos
    FOR SELECT USING (
        empresa_id IN (
            SELECT e.id FROM public.empresas e
            JOIN public.usuarios u ON e.usuario_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Empresas podem criar pedidos" ON public.pedidos
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT e.id FROM public.empresas e
            JOIN public.usuarios u ON e.usuario_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Empresas podem atualizar seus próprios pedidos" ON public.pedidos
    FOR UPDATE USING (
        empresa_id IN (
            SELECT e.id FROM public.empresas e
            JOIN public.usuarios u ON e.usuario_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Políticas para entregadores
CREATE POLICY "Entregadores podem ver seus próprios dados" ON public.entregadores
    FOR SELECT USING (
        usuario_id IN (
            SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
        )
    );

-- Políticas para localizações (apenas entregadores podem inserir/atualizar)
CREATE POLICY "Entregadores podem inserir suas localizações" ON public.localizacao_tempo_real
    FOR INSERT WITH CHECK (
        entregador_id IN (
            SELECT e.id FROM public.entregadores e
            JOIN public.usuarios u ON e.usuario_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Políticas para configurações (apenas leitura para usuários autenticados)
CREATE POLICY "Usuários autenticados podem ler configurações" ON public.configuracoes
    FOR SELECT USING (auth.role() = 'authenticated');

-- ===========================
-- FUNÇÕES AUXILIARES
-- ===========================

-- Função para buscar dados da empresa do usuário atual
CREATE OR REPLACE FUNCTION get_current_user_empresa()
RETURNS TABLE (
    empresa_id UUID,
    nome_fantasia VARCHAR,
    razao_social VARCHAR,
    cidade VARCHAR,
    estado VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.nome_fantasia,
        e.razao_social,
        e.cidade,
        e.estado
    FROM public.empresas e
    JOIN public.usuarios u ON e.usuario_id = u.id
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar ID da empresa do usuário atual
CREATE OR REPLACE FUNCTION get_current_user_empresa_id()
RETURNS UUID AS $$
DECLARE
    empresa_uuid UUID;
BEGIN
    SELECT e.id INTO empresa_uuid
    FROM public.empresas e
    JOIN public.usuarios u ON e.usuario_id = u.id
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1;
    
    RETURN empresa_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================
-- DADOS INICIAIS
-- ===========================

-- Inserir configurações padrão
INSERT INTO public.configuracoes (chave, valor, descricao, tipo) VALUES
    ('comissao_plataforma', '15', 'Porcentagem de comissão da plataforma', 'number'),
    ('frete_base', '15.00', 'Taxa base do frete em reais', 'number'),
    ('frete_por_km', '2.50', 'Taxa por quilômetro em reais', 'number'),
    ('frete_minimo', '10.00', 'Valor mínimo do frete em reais', 'number'),
    ('frete_maximo', '200.00', 'Valor máximo do frete em reais', 'number'),
    ('sistema_ativo', 'true', 'Status do sistema (ativo/inativo)', 'boolean')
ON CONFLICT (chave) DO NOTHING;

-- ===========================
-- COMENTÁRIOS
-- ===========================

COMMENT ON TABLE public.usuarios IS 'Tabela base para todos os usuários do sistema';
COMMENT ON TABLE public.empresas IS 'Dados das empresas cadastradas na plataforma';
COMMENT ON TABLE public.entregadores IS 'Dados dos entregadores cadastrados na plataforma';
COMMENT ON TABLE public.pedidos IS 'Pedidos de entrega criados pelas empresas';
COMMENT ON TABLE public.localizacao_tempo_real IS 'Localizações em tempo real dos entregadores';
COMMENT ON TABLE public.configuracoes IS 'Configurações gerais da plataforma';

COMMENT ON FUNCTION get_current_user_empresa() IS 'Retorna dados da empresa do usuário autenticado';
COMMENT ON FUNCTION get_current_user_empresa_id() IS 'Retorna ID da empresa do usuário autenticado';

