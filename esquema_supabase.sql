-- ===============================================================
-- Esquema Supabase: App Control Tirzepatida (AniMed)
-- ===============================================================

-- Habilitar extensión UUID si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Crear tabla de perfiles (extiende la info de autenticación)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role TEXT CHECK (role IN ('doctor', 'patient')) NOT NULL,
    username TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name_p TEXT NOT NULL,
    last_name_m TEXT,
    dob DATE,
    assigned_doctor_id UUID REFERENCES public.profiles(id), -- Para vincular pacientes a sus doctores
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear tabla de inyecciones y control de peso
CREATE TABLE IF NOT EXISTS public.injections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    injection_date TIMESTAMPTZ DEFAULT NOW(),
    dose_mg NUMERIC(5,2) NOT NULL,
    weight_kg NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Configurar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injections ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
-- Un usuario puede ver su propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Los doctores pueden ver los perfiles de sus pacientes y otros perfiles
DROP POLICY IF EXISTS "Doctors can view their patients" ON public.profiles;
CREATE POLICY "Doctors can view their patients" 
ON public.profiles FOR SELECT 
USING (auth.uid() = assigned_doctor_id OR role = 'doctor');

-- Permitir insertar perfiles
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
CREATE POLICY "Enable insert for authenticated users"
ON public.profiles FOR INSERT
WITH CHECK (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'doctor')
);

-- Permitir actualizar su propio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Políticas para Injections
-- Los pacientes ven y crean sus propios registros
DROP POLICY IF EXISTS "Patients manage own injections" ON public.injections;
CREATE POLICY "Patients manage own injections" 
ON public.injections FOR ALL 
USING (auth.uid() = patient_id);

-- Los doctores pueden ver los registros de sus pacientes asignados
DROP POLICY IF EXISTS "Doctors view patients injections" ON public.injections;
CREATE POLICY "Doctors view patients injections" 
ON public.injections FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE public.profiles.id = public.injections.patient_id 
        AND public.profiles.assigned_doctor_id = auth.uid()
    )
);

-- ===============================================================
-- Trigger Automático: Sincronizar auth.users con public.profiles
-- Sincroniza la metadata de Auth con la tabla de perfiles
-- ===============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    role,
    username,
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
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
