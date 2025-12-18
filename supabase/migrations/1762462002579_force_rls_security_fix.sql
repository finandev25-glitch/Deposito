/*
          # [CRITICAL SECURITY FIX] Forzar Habilitación de Row-Level Security (RLS)
          Este script FUERZA la activación de la Seguridad a Nivel de Fila (RLS) en todas las tablas de datos públicos, eliminando políticas existentes para recrearlas y asegurar su correcta aplicación. Esta es una medida definitiva para cerrar la brecha de seguridad detectada.

          ## Query Description: [Este es un cambio de seguridad fundamental y contundente. Una vez aplicado, el acceso anónimo a las tablas será bloqueado de forma forzada. Todas las futuras consultas a estas tablas requerirán un token de autenticación (JWT) válido. Si tienes servicios externos que acceden a los datos de forma anónima, dejarán de funcionar. No se espera pérdida de datos.]
          
          ## Metadata:
          - Schema-Category: ["Dangerous"]
          - Impact-Level: ["High"]
          - Requires-Backup: [true]
          - Reversible: [true]
          
          ## Structure Details:
          - Tablas afectadas: bancos, empresas, cuentas_bancarias, sucursales, sucursal_personal, depositos, profiles.
          - Se habilita y fuerza RLS en cada tabla.
          - Se eliminan y recrean las políticas de acceso para usuarios autenticados.
          
          ## Security Implications:
          - RLS Status: [Forced Enabled]
          - Policy Changes: [Yes, policies are dropped and recreated.]
          - Auth Requirements: [Todos los accesos a estas tablas ahora requerirán autenticación.]
          
          ## Performance Impact:
          - Indexes: [No changes]
          - Triggers: [No changes]
          - Estimated Impact: [Mínimo. Las consultas pueden tener una sobrecarga de rendimiento muy pequeña debido a la comprobación de políticas, pero es insignificante en comparación con el beneficio de seguridad.]
          */

-- Habilitar y forzar RLS para la tabla 'bancos'
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.bancos;
CREATE POLICY "Enable all access for authenticated users" ON public.bancos FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.bancos FORCE ROW LEVEL SECURITY;

-- Habilitar y forzar RLS para la tabla 'empresas'
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.empresas;
CREATE POLICY "Enable all access for authenticated users" ON public.empresas FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.empresas FORCE ROW LEVEL SECURITY;

-- Habilitar y forzar RLS para la tabla 'cuentas_bancarias'
ALTER TABLE public.cuentas_bancarias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.cuentas_bancarias;
CREATE POLICY "Enable all access for authenticated users" ON public.cuentas_bancarias FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.cuentas_bancarias FORCE ROW LEVEL SECURITY;

-- Habilitar y forzar RLS para la tabla 'sucursales'
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.sucursales;
CREATE POLICY "Enable all access for authenticated users" ON public.sucursales FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.sucursales FORCE ROW LEVEL SECURITY;

-- Habilitar y forzar RLS para la tabla 'sucursal_personal'
ALTER TABLE public.sucursal_personal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.sucursal_personal;
CREATE POLICY "Enable all access for authenticated users" ON public.sucursal_personal FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.sucursal_personal FORCE ROW LEVEL SECURITY;

-- Habilitar y forzar RLS para la tabla 'depositos'
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.depositos;
CREATE POLICY "Enable all access for authenticated users" ON public.depositos FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE public.depositos FORCE ROW LEVEL SECURITY;

-- Habilitar y forzar RLS para la tabla 'profiles'
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
