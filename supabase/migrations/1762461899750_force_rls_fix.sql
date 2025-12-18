/*
          # [CRITICAL SECURITY FIX] Forzar Habilitación de Row-Level Security (RLS)
          Este script fuerza la activación de la Seguridad a Nivel de Fila (RLS) en todas las tablas de datos públicos y restablece las políticas base para asegurar que solo los usuarios autenticados puedan acceder a la información. Es una medida definitiva para cerrar la brecha de seguridad detectada.
          ## Query Description: [Este es un cambio de seguridad fundamental y obligatorio. Una vez aplicado, el acceso anónimo a las tablas será bloqueado. Todas las futuras consultas a estas tablas requerirán un token de autenticación (JWT) válido. Si tienes servicios externos que acceden a los datos de forma anónima, dejarán de funcionar. No se espera pérdida de datos, pero es la medida de seguridad más importante para tu aplicación.]
          ## Metadata:
          - Schema-Category: ["Dangerous"]
          - Impact-Level: ["High"]
          - Requires-Backup: [true]
          - Reversible: [true]
          ## Structure Details:
          - Tablas afectadas: bancos, empresas, cuentas_bancarias, sucursales, sucursal_personal, depositos, profiles.
          - Se fuerza la habilitación de RLS en cada tabla.
          - Se eliminan políticas existentes y se crean políticas correctas para cada tabla.
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [Yes]
          - Auth Requirements: [Todos los accesos a estas tablas ahora requerirán autenticación.]
          ## Performance Impact:
          - Indexes: [No changes]
          - Triggers: [No changes]
          - Estimated Impact: [Mínimo. Las consultas pueden tener una sobrecarga de rendimiento muy pequeña debido a la comprobación de políticas, pero es insignificante en comparación con el beneficio de seguridad.]
          */
-- Habilitar RLS para la tabla 'bancos' y crear política
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.bancos;
CREATE POLICY "Enable all access for authenticated users" ON public.bancos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
-- Habilitar RLS para la tabla 'empresas' y crear política
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.empresas;
CREATE POLICY "Enable all access for authenticated users" ON public.empresas
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
-- Habilitar RLS para la tabla 'cuentas_bancarias' y crear política
ALTER TABLE public.cuentas_bancarias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.cuentas_bancarias;
CREATE POLICY "Enable all access for authenticated users" ON public.cuentas_bancarias
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
-- Habilitar RLS para la tabla 'sucursales' y crear política
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.sucursales;
CREATE POLICY "Enable all access for authenticated users" ON public.sucursales
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
-- Habilitar RLS para la tabla 'sucursal_personal' y crear política
ALTER TABLE public.sucursal_personal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.sucursal_personal;
CREATE POLICY "Enable all access for authenticated users" ON public.sucursal_personal
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
-- Habilitar RLS para la tabla 'depositos' y crear política
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.depositos;
CREATE POLICY "Enable all access for authenticated users" ON public.depositos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
-- Habilitar RLS para la tabla 'profiles' y crear políticas específicas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
-- Política para que los administradores puedan ver todos los perfiles (necesario para el módulo de usuarios)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');
