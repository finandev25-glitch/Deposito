-- Eliminar políticas restrictivas existentes y permitir a todos los usuarios autenticados gestionar las entidades.

-- Bancos
DROP POLICY IF EXISTS "Los administradores pueden gestionar bancos" ON public.bancos;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden leer bancos" ON public.bancos;
CREATE POLICY "Los usuarios autenticados pueden gestionar bancos"
  ON public.bancos FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Empresas
DROP POLICY IF EXISTS "Los administradores pueden hacer todo en empresas" ON public.empresas;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden leer empresas" ON public.empresas;
CREATE POLICY "Los usuarios autenticados pueden gestionar empresas"
  ON public.empresas FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Cuentas Bancarias
DROP POLICY IF EXISTS "Los administradores pueden gestionar cuentas" ON public.cuentas_bancarias;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden leer cuentas" ON public.cuentas_bancarias;
CREATE POLICY "Los usuarios autenticados pueden gestionar cuentas"
  ON public.cuentas_bancarias FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Sucursales
DROP POLICY IF EXISTS "Los administradores pueden gestionar sucursales" ON public.sucursales;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden leer sucursales" ON public.sucursales;
CREATE POLICY "Los usuarios autenticados pueden gestionar sucursales"
  ON public.sucursales FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Sucursal Personal
DROP POLICY IF EXISTS "Los administradores pueden gestionar el personal" ON public.sucursal_personal;
DROP POLICY IF EXISTS "Los usuarios autenticados pueden leer el personal" ON public.sucursal_personal;
CREATE POLICY "Los usuarios autenticados pueden gestionar el personal"
  ON public.sucursal_personal FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Depósitos
DROP POLICY IF EXISTS "Los usuarios pueden gestionar sus propios depositos" ON public.depositos;
DROP POLICY IF EXISTS "Los administradores pueden ver todos los depositos" ON public.depositos;
CREATE POLICY "Los usuarios autenticados pueden gestionar depósitos"
  ON public.depositos FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
  
-- Documentos
DROP POLICY IF EXISTS "Los usuarios pueden gestionar sus propios documentos" ON public.documentos;
DROP POLICY IF EXISTS "Los administradores pueden ver todos los documentos" ON public.documentos;
CREATE POLICY "Los usuarios autenticados pueden gestionar documentos"
  ON public.documentos FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
