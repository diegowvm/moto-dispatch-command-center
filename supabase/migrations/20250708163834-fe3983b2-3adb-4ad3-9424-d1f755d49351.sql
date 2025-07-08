-- FASE 1: BACKEND OPTIMIZATION
-- 1.1 Função PostgreSQL Consolidada para Dashboard Metrics
CREATE OR REPLACE FUNCTION get_dashboard_metrics_optimized()
RETURNS TABLE (
    total_hoje BIGINT,
    entregues_hoje BIGINT,
    pendentes BIGINT,
    em_andamento BIGINT,
    receita_hoje NUMERIC,
    entregadores_disponiveis BIGINT,
    entregadores_ocupados BIGINT,
    total_entregadores BIGINT
) LANGUAGE plpgsql AS $$
DECLARE
    today_start TIMESTAMP := CURRENT_DATE;
    cache_key TEXT := 'dashboard_metrics_' || EXTRACT(epoch FROM today_start)::TEXT;
    cached_result RECORD;
BEGIN
    -- Cache interno de 2 minutos
    SELECT INTO cached_result *
    FROM pg_temp.dashboard_cache 
    WHERE key = cache_key AND created_at > NOW() - INTERVAL '2 minutes'
    LIMIT 1;
    
    IF cached_result IS NULL THEN
        -- Criar tabela temporária para cache se não existir
        CREATE TEMP TABLE IF NOT EXISTS pg_temp.dashboard_cache (
            key TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            data JSONB
        );
        
        -- Executar queries consolidadas
        WITH metrics AS (
            SELECT
                COUNT(*) FILTER (WHERE created_at >= today_start) AS total_hoje,
                COUNT(*) FILTER (WHERE status = 'entregue' AND data_finalizacao >= today_start) AS entregues_hoje,
                COUNT(*) FILTER (WHERE status = 'recebido') AS pendentes,
                COUNT(*) FILTER (WHERE status IN ('enviado', 'a_caminho')) AS em_andamento,
                COALESCE(SUM(valor_total) FILTER (WHERE status = 'entregue' AND data_finalizacao >= today_start), 0) AS receita_hoje
            FROM public.pedidos
        ),
        entregadores_stats AS (
            SELECT
                COUNT(*) FILTER (WHERE status IN ('disponivel', 'offline')) AS entregadores_disponiveis,
                COUNT(*) FILTER (WHERE status IN ('ocupado', 'em_entrega')) AS entregadores_ocupados,
                COUNT(*) AS total_entregadores
            FROM public.entregadores
        )
        INSERT INTO pg_temp.dashboard_cache (key, data)
        SELECT cache_key, jsonb_build_object(
            'total_hoje', m.total_hoje,
            'entregues_hoje', m.entregues_hoje,
            'pendentes', m.pendentes,
            'em_andamento', m.em_andamento,
            'receita_hoje', m.receita_hoje,
            'entregadores_disponiveis', e.entregadores_disponiveis,
            'entregadores_ocupados', e.entregadores_ocupados,
            'total_entregadores', e.total_entregadores
        )
        FROM metrics m, entregadores_stats e;
    END IF;
    
    -- Retornar dados do cache
    SELECT INTO cached_result * FROM pg_temp.dashboard_cache WHERE key = cache_key LIMIT 1;
    
    RETURN QUERY
    SELECT
        (cached_result.data->>'total_hoje')::BIGINT,
        (cached_result.data->>'entregues_hoje')::BIGINT,
        (cached_result.data->>'pendentes')::BIGINT,
        (cached_result.data->>'em_andamento')::BIGINT,
        (cached_result.data->>'receita_hoje')::NUMERIC,
        (cached_result.data->>'entregadores_disponiveis')::BIGINT,
        (cached_result.data->>'entregadores_ocupados')::BIGINT,
        (cached_result.data->>'total_entregadores')::BIGINT;
END;
$$;

-- 1.2 Índices Compostos de Performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_created_status ON public.pedidos (created_at DESC, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_finalizacao_status ON public.pedidos (data_finalizacao DESC, status) WHERE data_finalizacao IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedidos_empresa_status_created ON public.pedidos (empresa_id, status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entregadores_status ON public.entregadores (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_localizacao_entregador_timestamp ON public.localizacao_tempo_real (entregador_id, timestamp DESC);

-- 1.3 Views Materializadas para Charts
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics_hourly AS
SELECT 
    DATE_TRUNC('hour', data_finalizacao) as hora,
    COUNT(*) as entregas,
    EXTRACT(hour FROM data_finalizacao)::INTEGER as hour_of_day
FROM public.pedidos 
WHERE status = 'entregue' 
    AND data_finalizacao >= CURRENT_DATE 
    AND data_finalizacao IS NOT NULL
GROUP BY DATE_TRUNC('hour', data_finalizacao), EXTRACT(hour FROM data_finalizacao)
ORDER BY hora;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_metrics_hourly_hora ON dashboard_metrics_hourly (hora);

CREATE MATERIALIZED VIEW IF NOT EXISTS status_distribution_weekly AS
SELECT 
    status,
    COUNT(*) as count,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
FROM public.pedidos 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_status_distribution_weekly_status ON status_distribution_weekly (status);

-- Função para refresh automático das views materializadas
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics_hourly;
    REFRESH MATERIALIZED VIEW CONCURRENTLY status_distribution_weekly;
END;
$$;

-- Trigger para refresh automático a cada nova entrega
CREATE OR REPLACE FUNCTION trigger_refresh_views()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    -- Refresh apenas se o status mudou para 'entregue'
    IF NEW.status = 'entregue' AND OLD.status != 'entregue' THEN
        -- Usar pg_notify para refresh assíncrono
        PERFORM pg_notify('refresh_views', 'dashboard_update');
    END IF;
    RETURN NEW;
END;
$$;

-- Aplicar trigger na tabela pedidos
DROP TRIGGER IF EXISTS trigger_refresh_dashboard_views ON public.pedidos;
CREATE TRIGGER trigger_refresh_dashboard_views
    AFTER UPDATE ON public.pedidos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_views();

-- Configurar realtime para as tabelas críticas
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.entregadores REPLICA IDENTITY FULL;
ALTER TABLE public.localizacao_tempo_real REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação realtime
SELECT cron.schedule('refresh-dashboard-views', '*/5 * * * *', 'SELECT refresh_dashboard_views();');