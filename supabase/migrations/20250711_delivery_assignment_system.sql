-- ===========================
-- MIGRAÇÃO: Sistema de Atribuição Automática de Entregas
-- Data: 2025-07-11
-- Descrição: Adiciona funcionalidades para atribuição automática e gestão avançada de entregadores
-- ===========================

-- Tabela para histórico de aprovações de entregadores
CREATE TABLE IF NOT EXISTS public.historico_aprovacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entregador_id UUID NOT NULL REFERENCES public.entregadores(id) ON DELETE CASCADE,
    acao TEXT NOT NULL CHECK (acao IN ('aprovar', 'rejeitar', 'suspender', 'reativar')),
    motivo TEXT,
    aprovado_por UUID NOT NULL REFERENCES public.usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela para configurações do sistema de atribuição
INSERT INTO public.configuracoes (chave, valor, descricao, tipo)
VALUES 
    ('atribuicao_automatica', 'true', 'Ativar atribuição automática de pedidos', 'boolean'),
    ('criterio_atribuicao', 'proximidade', 'Critério para atribuição (proximidade, avaliacao, balanceamento)', 'text'),
    ('raio_maximo', '5', 'Raio máximo em km para buscar entregadores', 'integer'),
    ('max_pedidos_simultaneos', '3', 'Máximo de pedidos simultâneos por entregador', 'integer'),
    ('tempo_limite_resposta', '300', 'Tempo limite em segundos para entregador aceitar pedido', 'integer')
ON CONFLICT (chave) DO NOTHING;

-- Tabela para log de atribuições automáticas
CREATE TABLE IF NOT EXISTS public.log_atribuicoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    entregador_id UUID REFERENCES public.entregadores(id) ON DELETE SET NULL,
    tipo_atribuicao TEXT NOT NULL CHECK (tipo_atribuicao IN ('automatica', 'manual')),
    criterio_usado TEXT,
    distancia_km DECIMAL(8,2),
    tempo_resposta_segundos INTEGER,
    status TEXT NOT NULL DEFAULT 'atribuido' CHECK (status IN ('atribuido', 'aceito', 'rejeitado', 'timeout')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adicionar campos necessários na tabela entregadores se não existirem
ALTER TABLE public.entregadores 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS disponivel BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS localizacao_atual JSONB,
ADD COLUMN IF NOT EXISTS max_pedidos_simultaneos INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS aceita_pedidos_automaticos BOOLEAN DEFAULT true;

-- Adicionar campos necessários na tabela pedidos se não existirem
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS data_atribuicao TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tipo_atribuicao TEXT DEFAULT 'manual' CHECK (tipo_atribuicao IN ('automatica', 'manual')),
ADD COLUMN IF NOT EXISTS tempo_limite_resposta TIMESTAMP WITH TIME ZONE;

-- Função para calcular distância entre dois pontos (Haversine)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371; -- Raio da Terra em km
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);
    
    a := sin(dLat/2) * sin(dLat/2) + 
         cos(radians(lat1)) * cos(radians(lat2)) * 
         sin(dLon/2) * sin(dLon/2);
    
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Função para encontrar entregador disponível
CREATE OR REPLACE FUNCTION find_available_delivery_person(
    pedido_lat DECIMAL,
    pedido_lon DECIMAL,
    criterio TEXT DEFAULT 'proximidade'
) RETURNS UUID AS $$
DECLARE
    entregador_id UUID;
    raio_maximo INTEGER;
    max_pedidos INTEGER;
BEGIN
    -- Buscar configurações
    SELECT valor::INTEGER INTO raio_maximo 
    FROM public.configuracoes 
    WHERE chave = 'raio_maximo';
    
    SELECT valor::INTEGER INTO max_pedidos 
    FROM public.configuracoes 
    WHERE chave = 'max_pedidos_simultaneos';
    
    -- Definir valores padrão se não encontrados
    raio_maximo := COALESCE(raio_maximo, 5);
    max_pedidos := COALESCE(max_pedidos, 3);
    
    -- Buscar entregador baseado no critério
    IF criterio = 'proximidade' THEN
        SELECT e.id INTO entregador_id
        FROM public.entregadores e
        JOIN public.usuarios u ON e.usuario_id = u.id
        LEFT JOIN (
            SELECT entregador_id, COUNT(*) as pedidos_ativos
            FROM public.pedidos 
            WHERE status IN ('enviado', 'a_caminho')
            GROUP BY entregador_id
        ) p ON e.id = p.entregador_id
        WHERE e.status_aprovacao = 'aprovado'
        AND e.ativo = true
        AND e.disponivel = true
        AND e.aceita_pedidos_automaticos = true
        AND e.localizacao_atual IS NOT NULL
        AND (e.last_seen IS NULL OR e.last_seen > NOW() - INTERVAL '5 minutes')
        AND COALESCE(p.pedidos_ativos, 0) < COALESCE(e.max_pedidos_simultaneos, max_pedidos)
        AND calculate_distance(
            pedido_lat, pedido_lon,
            (e.localizacao_atual->>'lat')::DECIMAL,
            (e.localizacao_atual->>'lng')::DECIMAL
        ) <= raio_maximo
        ORDER BY calculate_distance(
            pedido_lat, pedido_lon,
            (e.localizacao_atual->>'lat')::DECIMAL,
            (e.localizacao_atual->>'lng')::DECIMAL
        ) ASC
        LIMIT 1;
        
    ELSIF criterio = 'avaliacao' THEN
        SELECT e.id INTO entregador_id
        FROM public.entregadores e
        JOIN public.usuarios u ON e.usuario_id = u.id
        LEFT JOIN (
            SELECT entregador_id, COUNT(*) as pedidos_ativos
            FROM public.pedidos 
            WHERE status IN ('enviado', 'a_caminho')
            GROUP BY entregador_id
        ) p ON e.id = p.entregador_id
        WHERE e.status_aprovacao = 'aprovado'
        AND e.ativo = true
        AND e.disponivel = true
        AND e.aceita_pedidos_automaticos = true
        AND e.localizacao_atual IS NOT NULL
        AND (e.last_seen IS NULL OR e.last_seen > NOW() - INTERVAL '5 minutes')
        AND COALESCE(p.pedidos_ativos, 0) < COALESCE(e.max_pedidos_simultaneos, max_pedidos)
        AND calculate_distance(
            pedido_lat, pedido_lon,
            (e.localizacao_atual->>'lat')::DECIMAL,
            (e.localizacao_atual->>'lng')::DECIMAL
        ) <= raio_maximo
        ORDER BY e.avaliacao_media DESC, calculate_distance(
            pedido_lat, pedido_lon,
            (e.localizacao_atual->>'lat')::DECIMAL,
            (e.localizacao_atual->>'lng')::DECIMAL
        ) ASC
        LIMIT 1;
        
    ELSIF criterio = 'balanceamento' THEN
        SELECT e.id INTO entregador_id
        FROM public.entregadores e
        JOIN public.usuarios u ON e.usuario_id = u.id
        LEFT JOIN (
            SELECT entregador_id, COUNT(*) as pedidos_ativos
            FROM public.pedidos 
            WHERE status IN ('enviado', 'a_caminho')
            GROUP BY entregador_id
        ) p ON e.id = p.entregador_id
        WHERE e.status_aprovacao = 'aprovado'
        AND e.ativo = true
        AND e.disponivel = true
        AND e.aceita_pedidos_automaticos = true
        AND e.localizacao_atual IS NOT NULL
        AND (e.last_seen IS NULL OR e.last_seen > NOW() - INTERVAL '5 minutes')
        AND COALESCE(p.pedidos_ativos, 0) < COALESCE(e.max_pedidos_simultaneos, max_pedidos)
        AND calculate_distance(
            pedido_lat, pedido_lon,
            (e.localizacao_atual->>'lat')::DECIMAL,
            (e.localizacao_atual->>'lng')::DECIMAL
        ) <= raio_maximo
        ORDER BY COALESCE(p.pedidos_ativos, 0) ASC, calculate_distance(
            pedido_lat, pedido_lon,
            (e.localizacao_atual->>'lat')::DECIMAL,
            (e.localizacao_atual->>'lng')::DECIMAL
        ) ASC
        LIMIT 1;
    END IF;
    
    RETURN entregador_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atribuir pedido automaticamente
CREATE OR REPLACE FUNCTION auto_assign_delivery(pedido_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    pedido_record RECORD;
    entregador_id UUID;
    criterio TEXT;
    tempo_limite INTEGER;
    distancia DECIMAL;
    atribuicao_ativa BOOLEAN;
BEGIN
    -- Verificar se atribuição automática está ativa
    SELECT valor::BOOLEAN INTO atribuicao_ativa 
    FROM public.configuracoes 
    WHERE chave = 'atribuicao_automatica';
    
    IF NOT COALESCE(atribuicao_ativa, false) THEN
        RETURN false;
    END IF;
    
    -- Buscar dados do pedido
    SELECT * INTO pedido_record
    FROM public.pedidos 
    WHERE id = pedido_id 
    AND status = 'recebido'
    AND entregador_id IS NULL;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Buscar configurações
    SELECT valor INTO criterio 
    FROM public.configuracoes 
    WHERE chave = 'criterio_atribuicao';
    
    SELECT valor::INTEGER INTO tempo_limite 
    FROM public.configuracoes 
    WHERE chave = 'tempo_limite_resposta';
    
    criterio := COALESCE(criterio, 'proximidade');
    tempo_limite := COALESCE(tempo_limite, 300);
    
    -- Encontrar entregador disponível
    SELECT find_available_delivery_person(
        (pedido_record.endereco_coleta->>'lat')::DECIMAL,
        (pedido_record.endereco_coleta->>'lng')::DECIMAL,
        criterio
    ) INTO entregador_id;
    
    IF entregador_id IS NULL THEN
        -- Registrar tentativa sem sucesso
        INSERT INTO public.log_atribuicoes (
            pedido_id, tipo_atribuicao, criterio_usado, status
        ) VALUES (
            pedido_id, 'automatica', criterio, 'rejeitado'
        );
        RETURN false;
    END IF;
    
    -- Calcular distância
    SELECT calculate_distance(
        (pedido_record.endereco_coleta->>'lat')::DECIMAL,
        (pedido_record.endereco_coleta->>'lng')::DECIMAL,
        (e.localizacao_atual->>'lat')::DECIMAL,
        (e.localizacao_atual->>'lng')::DECIMAL
    ) INTO distancia
    FROM public.entregadores e
    WHERE e.id = entregador_id;
    
    -- Atribuir pedido
    UPDATE public.pedidos 
    SET 
        entregador_id = entregador_id,
        status = 'enviado',
        data_atribuicao = NOW(),
        tipo_atribuicao = 'automatica',
        tempo_limite_resposta = NOW() + (tempo_limite || ' seconds')::INTERVAL,
        updated_at = NOW()
    WHERE id = pedido_id;
    
    -- Registrar atribuição
    INSERT INTO public.log_atribuicoes (
        pedido_id, entregador_id, tipo_atribuicao, criterio_usado, 
        distancia_km, status
    ) VALUES (
        pedido_id, entregador_id, 'automatica', criterio, 
        distancia, 'atribuido'
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atribuição automática quando pedido é criado
CREATE OR REPLACE FUNCTION trigger_auto_assign()
RETURNS TRIGGER AS $$
BEGIN
    -- Executar atribuição automática em background
    PERFORM auto_assign_delivery(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS auto_assign_on_insert ON public.pedidos;
CREATE TRIGGER auto_assign_on_insert
    AFTER INSERT ON public.pedidos
    FOR EACH ROW
    WHEN (NEW.status = 'recebido' AND NEW.entregador_id IS NULL)
    EXECUTE FUNCTION trigger_auto_assign();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_log_atribuicoes_updated_at 
    BEFORE UPDATE ON public.log_atribuicoes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS
ALTER TABLE public.historico_aprovacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_atribuicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar histórico de aprovações" ON public.historico_aprovacoes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE id = auth.uid() AND tipo = 'admin'
        )
    );

CREATE POLICY "Admins podem gerenciar log de atribuições" ON public.log_atribuicoes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE id = auth.uid() AND tipo = 'admin'
        )
    );

CREATE POLICY "Entregadores podem ver suas atribuições" ON public.log_atribuicoes
    FOR SELECT USING (
        entregador_id IN (
            SELECT id FROM public.entregadores 
            WHERE usuario_id = auth.uid()
        )
    );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_historico_aprovacoes_entregador_id ON public.historico_aprovacoes(entregador_id);
CREATE INDEX IF NOT EXISTS idx_historico_aprovacoes_created_at ON public.historico_aprovacoes(created_at);
CREATE INDEX IF NOT EXISTS idx_log_atribuicoes_pedido_id ON public.log_atribuicoes(pedido_id);
CREATE INDEX IF NOT EXISTS idx_log_atribuicoes_entregador_id ON public.log_atribuicoes(entregador_id);
CREATE INDEX IF NOT EXISTS idx_log_atribuicoes_created_at ON public.log_atribuicoes(created_at);
CREATE INDEX IF NOT EXISTS idx_entregadores_last_seen ON public.entregadores(last_seen);
CREATE INDEX IF NOT EXISTS idx_entregadores_disponivel ON public.entregadores(disponivel);
CREATE INDEX IF NOT EXISTS idx_entregadores_localizacao_atual ON public.entregadores USING GIN(localizacao_atual);
CREATE INDEX IF NOT EXISTS idx_pedidos_data_atribuicao ON public.pedidos(data_atribuicao);
CREATE INDEX IF NOT EXISTS idx_pedidos_tipo_atribuicao ON public.pedidos(tipo_atribuicao);

