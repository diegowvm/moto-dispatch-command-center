-- ================================================
-- OTIMIZAÇÕES DE PERFORMANCE - MOTO DISPATCH
-- ================================================

-- Criar índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_localizacao_tempo_real_entregador_id ON public.localizacao_tempo_real(entregador_id);
CREATE INDEX IF NOT EXISTS idx_localizacao_tempo_real_status ON public.localizacao_tempo_real(status);
CREATE INDEX IF NOT EXISTS idx_localizacao_tempo_real_timestamp ON public.localizacao_tempo_real(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_localizacao_tempo_real_composite ON public.localizacao_tempo_real(entregador_id, status, timestamp DESC);

-- Índices para pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_id ON public.pedidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_entregador_id ON public.pedidos(entregador_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON public.pedidos(created_at DESC);

-- Índices para entregadores
CREATE INDEX IF NOT EXISTS idx_entregadores_status ON public.entregadores(status);
CREATE INDEX IF NOT EXISTS idx_entregadores_usuario_id ON public.entregadores(usuario_id);

-- Índices para usuários
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON public.usuarios(tipo);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_user_id ON public.usuarios(auth_user_id);

-- ================================================
-- POLÍTICAS RLS OTIMIZADAS
-- ================================================

-- Habilitar RLS nas tabelas principais
ALTER TABLE public.localizacao_tempo_real ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas para localizacao_tempo_real
DROP POLICY IF EXISTS "Admins podem ver todas as localizações" ON public.localizacao_tempo_real;
CREATE POLICY "Admins podem ver todas as localizações" ON public.localizacao_tempo_real
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE auth_user_id = auth.uid() 
            AND tipo = 'admin'
        )
    );

DROP POLICY IF EXISTS "Entregadores podem ver suas próprias localizações" ON public.localizacao_tempo_real;
CREATE POLICY "Entregadores podem ver suas próprias localizações" ON public.localizacao_tempo_real
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.entregadores e
            JOIN public.usuarios u ON e.usuario_id = u.id
            WHERE u.auth_user_id = auth.uid() 
            AND e.id = entregador_id
        )
    );

DROP POLICY IF EXISTS "Entregadores podem atualizar suas localizações" ON public.localizacao_tempo_real;
CREATE POLICY "Entregadores podem atualizar suas localizações" ON public.localizacao_tempo_real
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.entregadores e
            JOIN public.usuarios u ON e.usuario_id = u.id
            WHERE u.auth_user_id = auth.uid() 
            AND e.id = entregador_id
        )
    );

-- Políticas para pedidos
DROP POLICY IF EXISTS "Admins podem ver todos os pedidos" ON public.pedidos;
CREATE POLICY "Admins podem ver todos os pedidos" ON public.pedidos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE auth_user_id = auth.uid() 
            AND tipo = 'admin'
        )
    );

DROP POLICY IF EXISTS "Empresas podem ver seus pedidos" ON public.pedidos;
CREATE POLICY "Empresas podem ver seus pedidos" ON public.pedidos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.empresas e
            JOIN public.usuarios u ON e.usuario_id = u.id
            WHERE u.auth_user_id = auth.uid() 
            AND e.id = empresa_id
        )
    );

DROP POLICY IF EXISTS "Entregadores podem ver seus pedidos" ON public.pedidos;
CREATE POLICY "Entregadores podem ver seus pedidos" ON public.pedidos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.entregadores e
            JOIN public.usuarios u ON e.usuario_id = u.id
            WHERE u.auth_user_id = auth.uid() 
            AND e.id = entregador_id
        )
    );

-- Políticas para entregadores
DROP POLICY IF EXISTS "Admins podem ver todos os entregadores" ON public.entregadores;
CREATE POLICY "Admins podem ver todos os entregadores" ON public.entregadores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE auth_user_id = auth.uid() 
            AND tipo = 'admin'
        )
    );

DROP POLICY IF EXISTS "Entregadores podem ver seus próprios dados" ON public.entregadores;
CREATE POLICY "Entregadores podem ver seus próprios dados" ON public.entregadores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.usuarios u
            WHERE u.auth_user_id = auth.uid() 
            AND u.id = usuario_id
        )
    );

-- Políticas para empresas
DROP POLICY IF EXISTS "Admins podem ver todas as empresas" ON public.empresas;
CREATE POLICY "Admins podem ver todas as empresas" ON public.empresas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE auth_user_id = auth.uid() 
            AND tipo = 'admin'
        )
    );

DROP POLICY IF EXISTS "Empresas podem ver seus próprios dados" ON public.empresas;
CREATE POLICY "Empresas podem ver seus próprios dados" ON public.empresas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.usuarios u
            WHERE u.auth_user_id = auth.uid() 
            AND u.id = usuario_id
        )
    );

-- Políticas para usuários
DROP POLICY IF EXISTS "Usuários podem ver seus próprios dados" ON public.usuarios;
CREATE POLICY "Usuários podem ver seus próprios dados" ON public.usuarios
    FOR SELECT USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins podem ver todos os usuários" ON public.usuarios;
CREATE POLICY "Admins podem ver todos os usuários" ON public.usuarios
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE auth_user_id = auth.uid() 
            AND tipo = 'admin'
        )
    );

-- ================================================
-- FUNÇÕES OTIMIZADAS
-- ================================================

-- Função para buscar localizações ativas com limite
CREATE OR REPLACE FUNCTION get_active_delivery_locations(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
    id UUID,
    entregador_id UUID,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status status_entregador,
    timestamp TIMESTAMP WITH TIME ZONE,
    entregador_nome TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ltr.id,
        ltr.entregador_id,
        ltr.latitude,
        ltr.longitude,
        ltr.status,
        ltr.timestamp,
        u.nome as entregador_nome
    FROM public.localizacao_tempo_real ltr
    JOIN public.entregadores e ON ltr.entregador_id = e.id
    JOIN public.usuarios u ON e.usuario_id = u.id
    WHERE ltr.status IN ('disponivel', 'ocupado', 'em_entrega')
    AND ltr.timestamp > NOW() - INTERVAL '1 hour'
    ORDER BY ltr.timestamp DESC
    LIMIT limit_count;
END;
$$;

-- Função para estatísticas do dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_entregadores', (
            SELECT COUNT(*) FROM public.entregadores WHERE status != 'offline'
        ),
        'entregadores_disponiveis', (
            SELECT COUNT(*) FROM public.entregadores WHERE status = 'disponivel'
        ),
        'entregadores_ocupados', (
            SELECT COUNT(*) FROM public.entregadores WHERE status = 'ocupado'
        ),
        'entregadores_em_entrega', (
            SELECT COUNT(*) FROM public.entregadores WHERE status = 'em_entrega'
        ),
        'pedidos_hoje', (
            SELECT COUNT(*) FROM public.pedidos 
            WHERE DATE(created_at) = CURRENT_DATE
        ),
        'pedidos_pendentes', (
            SELECT COUNT(*) FROM public.pedidos 
            WHERE status IN ('recebido', 'enviado', 'a_caminho')
        ),
        'total_empresas', (
            SELECT COUNT(*) FROM public.empresas WHERE status = true
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- ================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- ================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas principais
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER update_usuarios_updated_at 
    BEFORE UPDATE ON public.usuarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_empresas_updated_at ON public.empresas;
CREATE TRIGGER update_empresas_updated_at 
    BEFORE UPDATE ON public.empresas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_entregadores_updated_at ON public.entregadores;
CREATE TRIGGER update_entregadores_updated_at 
    BEFORE UPDATE ON public.entregadores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- CONFIGURAÇÕES DE PERFORMANCE
-- ================================================

-- Configurar parâmetros de performance para realtime
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Recarregar configurações
SELECT pg_reload_conf();

