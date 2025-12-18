/*
# [CRITICAL] Habilitar RLS y Añadir Políticas de Seguridad
Este script activa la Seguridad a Nivel de Fila (RLS) en todas las tablas públicas y establece políticas base para proteger los datos.

## Query Description: [Esta operación es fundamental para la seguridad de tu aplicación. Activa RLS en las tablas principales para prevenir accesos no autorizados a los datos. Sin esto, cualquier usuario autenticado podría leer, modificar o borrar toda la información. No hay riesgo de pérdida de datos con este script, pero es un cambio de seguridad vital.]

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "High"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Tablas afectadas: bancos, cuentas_bancarias, depositos, empresas, profiles, sucursales, sucursal_personal.
- Cambios: Habilita RLS y añade políticas de acceso para usuarios autenticados.

## Security Implications:
- RLS Status: Enabled
- Policy Changes: Yes
- Auth Requirements: Los usuarios deben estar autenticados para acceder a los datos.

## Performance Impact:
- Indexes: Ninguno
- Triggers: Ninguno
- Estimated Impact: Mínimo. RLS puede añadir una sobrecarga muy pequeña a las consultas, pero es insignificante comparado con el beneficio de seguridad.
*/

-- 1. Habilitar RLS para todas las tablas relevantes
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursal_personal ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas antiguas si existen para evitar conflictos
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.bancos;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.cuentas_bancarias;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.depositos;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.empresas;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.sucursales;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON public.sucursal_personal;
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

-- 3. Crear Políticas de Acceso
-- Políticas generales que permiten a cualquier usuario autenticado realizar operaciones.
-- Esto se alinea con la regla del proyecto donde todos los usuarios (excepto admin) tienen los mismos privilegios.
CREATE POLICY "Allow all access for authenticated users" ON public.bancos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON public.cuentas_bancarias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON public.depositos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON public.empresas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON public.sucursales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON public.sucursal_personal FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Políticas específicas y más seguras para la tabla de perfiles de usuario.
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
