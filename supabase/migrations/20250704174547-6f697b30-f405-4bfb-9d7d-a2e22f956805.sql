-- Função para vincular automaticamente auth.users com public.usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (auth_user_id, nome, email, tipo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'empresa'::tipo_usuario -- Tipo padrão
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar automaticamente registro em usuarios quando um usuário é criado no auth
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para verificar se o usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE auth_user_id = auth.uid() 
    AND tipo = 'admin'::tipo_usuario 
    AND status = true
  );
$$;

-- Corrigir o usuário admin existente (assumindo que existe um usuário admin no auth)
-- Atualizar o primeiro usuário admin encontrado para vincular com auth.users
DO $$
DECLARE
  admin_user_id UUID;
  first_auth_user_id UUID;
BEGIN
  -- Buscar o primeiro usuário admin sem auth_user_id
  SELECT u.id INTO admin_user_id
  FROM public.usuarios u
  WHERE u.tipo = 'admin'::tipo_usuario AND u.auth_user_id IS NULL
  LIMIT 1;
  
  -- Buscar o primeiro usuário do auth.users
  SELECT au.id INTO first_auth_user_id
  FROM auth.users au
  ORDER BY au.created_at
  LIMIT 1;
  
  -- Vincular se ambos existem
  IF admin_user_id IS NOT NULL AND first_auth_user_id IS NOT NULL THEN
    UPDATE public.usuarios
    SET auth_user_id = first_auth_user_id
    WHERE id = admin_user_id;
  END IF;
END $$;