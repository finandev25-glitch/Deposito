-- ================================================================
-- LIMPIAR Y SIMPLIFICAR POLÍTICAS RLS DE DEPOSITOS
-- Se eliminan 5 políticas duplicadas y se crea una sola optimizada
-- ================================================================

-- 1. Eliminar TODAS las políticas existentes (duplicadas y conflictivas)
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.depositos;
DROP POLICY IF EXISTS "Permitir acceso completo a administradores y finanzas" ON public.depositos;
DROP POLICY IF EXISTS "Permitir a vendedores ver sus propios depósitos" ON public.depositos;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden gestionar depósitos" ON public.depositos;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.depositos;

-- 2. Crear UNA SOLA política simple y eficiente
-- Permite acceso completo a todos los usuarios autenticados
CREATE POLICY "authenticated_users_full_access"
ON public.depositos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Asegurar que RLS está habilitado
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;

-- 4. Comentario explicativo
COMMENT ON POLICY "authenticated_users_full_access" ON public.depositos IS
'Política simplificada que permite acceso completo a usuarios autenticados.
Anteriormente había 5 políticas duplicadas que causaban lentitud en las queries.';
