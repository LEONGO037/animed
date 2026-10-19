-- ===============================================================
-- FIX: RESOLUCIÓN DE LOGIN POR USUARIO Y AUTO-CONFIRMACIÓN
-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase
-- ===============================================================

-- 1. Asegurar que la tabla public.profiles tenga la columna email
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Poblar la columna email en profiles a partir de auth.users si estaba vacía
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- 3. Función segura para que la pantalla de Login (anon) pueda resolver el email según el username
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Buscar primero en public.profiles
  SELECT email INTO v_email
  FROM public.profiles
  WHERE lower(username) = lower(trim(p_username))
  LIMIT 1;

  IF v_email IS NOT NULL AND v_email <> '' THEN
    RETURN v_email;
  END IF;

  -- Si no se encuentra en profiles, buscar en auth.users (metadata)
  SELECT email INTO v_email
  FROM auth.users
  WHERE lower(raw_user_meta_data->>'username') = lower(trim(p_username))
  LIMIT 1;

  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos de ejecución tanto a anónimos (pantalla de login) como a autenticados
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;

-- 4. Auto-confirmar cualquier nuevo usuario creado desde la app para evitar el bloqueo "Email not confirmed"
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_confirm_user ON auth.users;
CREATE TRIGGER trigger_auto_confirm_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_user();

-- 5. Confirmar inmediatamente todas las cuentas que se hayan creado previamente y estén pendientes de confirmación
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email_confirmed_at IS NULL;

-- 6. Actualizar trigger handle_new_user para que guarde siempre el email en profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    role,
    username,
    email,
    first_name,
    last_name_p,
    last_name_m,
    dob,
    assigned_doctor_id
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'patient'),
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', 'Usuario'),
    COALESCE(new.raw_user_meta_data->>'last_name_p', ''),
    new.raw_user_meta_data->>'last_name_m',
    CASE 
      WHEN new.raw_user_meta_data->>'dob' IS NOT NULL AND new.raw_user_meta_data->>'dob' != '' 
      THEN (new.raw_user_meta_data->>'dob')::date 
      ELSE NULL 
    END,
    CASE 
      WHEN new.raw_user_meta_data->>'assigned_doctor_id' IS NOT NULL AND new.raw_user_meta_data->>'assigned_doctor_id' != '' 
      THEN (new.raw_user_meta_data->>'assigned_doctor_id')::uuid 
      ELSE NULL 
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
