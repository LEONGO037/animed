-- ===============================================================
-- SOLUCIÓN: Habilitar a los médicos para registrar y gestionar inyecciones
-- Ejecuta este script en el SQL Editor de tu panel de Supabase
-- ===============================================================

-- 1. Eliminar políticas restrictivas previas de la tabla injections
DROP POLICY IF EXISTS "Patients manage own injections" ON public.injections;
DROP POLICY IF EXISTS "Doctors view patients injections" ON public.injections;
DROP POLICY IF EXISTS "Doctors manage patients injections" ON public.injections;
DROP POLICY IF EXISTS "Doctors can insert patient injections" ON public.injections;

-- 2. Asegurar que RLS esté activo en la tabla
ALTER TABLE public.injections ENABLE ROW LEVEL SECURITY;

-- 3. Política para Pacientes: pueden ver y registrar sus propias inyecciones
CREATE POLICY "Patients manage own injections" 
ON public.injections FOR ALL 
USING (auth.uid() = patient_id)
WITH CHECK (auth.uid() = patient_id);

-- 4. Política para Doctores: pueden ver, insertar, actualizar y borrar inyecciones
-- para cualquier paciente vinculado a ellos O si el usuario autenticado tiene rol de doctor
CREATE POLICY "Doctors manage patients injections" 
ON public.injections FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE public.profiles.id = auth.uid() 
        AND public.profiles.role = 'doctor'
    )
    OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE public.profiles.id = public.injections.patient_id 
        AND public.profiles.assigned_doctor_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE public.profiles.id = auth.uid() 
        AND public.profiles.role = 'doctor'
    )
    OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE public.profiles.id = public.injections.patient_id 
        AND public.profiles.assigned_doctor_id = auth.uid()
    )
);
