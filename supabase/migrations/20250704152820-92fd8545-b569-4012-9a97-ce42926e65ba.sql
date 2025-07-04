-- Habilitar realtime para as tabelas principais
ALTER TABLE public.entregadores REPLICA IDENTITY FULL;
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.localizacao_tempo_real REPLICA IDENTITY FULL;
ALTER TABLE public.mensagens REPLICA IDENTITY FULL;

-- Adicionar as tabelas à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.entregadores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.localizacao_tempo_real;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens;