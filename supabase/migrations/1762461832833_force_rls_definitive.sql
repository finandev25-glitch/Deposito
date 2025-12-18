/*
          # [CRITICAL SECURITY FIX - DEFINITIVE] Forzar Habilitación de Row-Level Security (RLS)
          Este script fuerza la activación de la Seguridad a Nivel de Fila (RLS) en todas las tablas de datos públicos y restablece las políticas de seguridad base. Esta es una medida definitiva para cerrar la brecha de seguridad detectada.

          ## Query Description: [Este script es una corrección de seguridad crítica. Forzará la RLS en todas las tablas, bloqueando cualquier acceso que no cumpla con las políticas definidas. Es el paso final y obligatorio para asegurar la base de datos antes de continuar con nuevas funcionalidades. No se espera pérdida de datos.]
          
          ## Metadata:
          - Schema-Category: ["Dangerous"]
          - Impact-Level: ["High"]
          - Requires-Backup: [true]
          - Reversible: [true]
          
          ## Structure Details:
          - Tablas afectadas: bancos, empresas, cuentas_bancarias, sucursales, sucursal_personal, depositos, profiles.
          - Se fuerza la habilitación de RLS en cada tabla.
          - Se re-crean las políticas de acceso para usuarios autenticados.
          
          ## Security Implications:
          - RLS Status: [Forzado a Enabled]
          - Policy Changes: [Yes, policies are re-applied to ensure correctness.]
          - Auth Requirements: [Todo el acceso a estas tablas requerirá autenticación y cumplirá con las políticas.]
          
          ## Performance Impact:
          - Indexes: [No changes]
          - Triggers: [No changes]
          - Estimated Impact: [Mínimo. El beneficio de seguridad supera con creces cualquier sobrecarga de rendimiento.]
          */

-- Habilitar y Forzar RLS para la tabla 'bancos'
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bancos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.bancos;
CREATE POLICY "Enable all access for authenticated users" ON public.bancos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Habilitar y Forzar RLS para la tabla 'empresas'
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.empresas;
CREATE POLICY "Enable all access for authenticated users" ON public.empresas
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Habilitar y Forzar RLS para la tabla 'cuentas_bancarias'
ALTER TABLE public.cuentas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_bancarias FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.cuentas_bancarias;
CREATE POLICY "Enable all access for authenticated users" ON public.cuentas_bancarias
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Habilitar y Forzar RLS para la tabla 'sucursales'
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.sucursales;
CREATE POLICY "Enable all access for authenticated users" ON public.sucursales
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Habilitar y Forzar RLS para la tabla 'sucursal_personal'
ALTER TABLE public.sucursal_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursal_personal FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.sucursal_personal;
CREATE POLICY "Enable all access for authenticated users" ON public.sucursal_personal
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Habilitar y Forzar RLS para la tabla 'depositos'
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depositos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.depositos;
CREATE POLICY "Enable all access for authenticated users" ON public.depositos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Habilitar y Forzar RLS para la tabla 'profiles'
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
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

-- Política para que los administradores puedan ver todos los perfiles (necesario para la vista de usuarios)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT
TO authenticated
USING ( (SELECT rol FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- Política para que los administradores puedan actualizar el estado de otros usuarios
DROP POLICY IF EXISTS "Admins can update other users status" ON public.profiles;
CREATE POLICY "Admins can update other users status" ON public.profiles
FOR UPDATE
TO authenticated
USING ( (SELECT rol FROM public.profiles WHERE id = auth.uid()) = 'admin' )
WITH CHECK ( (SELECT rol FROM public.profiles WHERE id = auth.uid()) = 'admin' );
