-- ===============================================================
-- REGISTRO DE MÉDICO EN SUPABASE (Auth & Profiles)
-- Dr. Marcelo Anibarro Paco
-- ===============================================================

-- Habilitar extensiones de seguridad
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_email TEXT := 'anibarro30@gmail.com';
  v_password TEXT := 'AniMed2022!';
  v_username TEXT := 'marceloa';
  v_first_name TEXT := 'Marcelo';
  v_last_name_p TEXT := 'Anibarro';
  v_last_name_m TEXT := 'Paco';
  v_dob DATE := '1988-07-30';
BEGIN
  -- 1. Verificar si el usuario ya existe en auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    -- Actualizar contraseña y metadata si ya existía
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(v_password, gen_salt('bf')),
      raw_user_meta_data = jsonb_build_object(
        'role', 'doctor',
        'username', v_username,
        'first_name', v_first_name,
        'last_name_p', v_last_name_p,
        'last_name_m', v_last_name_m,
        'dob', v_dob
      ),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = v_user_id;
  ELSE
    -- 2. Insertar nuevo usuario en auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'role', 'doctor',
        'username', v_username,
        'first_name', v_first_name,
        'last_name_p', v_last_name_p,
        'last_name_m', v_last_name_m,
        'dob', v_dob
      ),
      now(),
      now()
    );

    -- 3. Insertar identidad de autenticación
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;
  END IF;

  -- 4. Insertar o actualizar en public.profiles
  INSERT INTO public.profiles (
    id,
    role,
    username,
    first_name,
    last_name_p,
    last_name_m,
    dob,
    created_at
  )
  VALUES (
    v_user_id,
    'doctor',
    v_username,
    v_first_name,
    v_last_name_p,
    v_last_name_m,
    v_dob,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'doctor',
    username = EXCLUDED.username,
    first_name = EXCLUDED.first_name,
    last_name_p = EXCLUDED.last_name_p,
    last_name_m = EXCLUDED.last_name_m,
    dob = EXCLUDED.dob;

  RAISE NOTICE 'Médico registrado exitosamente con ID %', v_user_id;
END $$;
