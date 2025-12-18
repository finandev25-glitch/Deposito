-- =====================================================
-- SOLUCION INMEDIATA WHATSAPP_CONFIG
-- Crear políticas RLS o deshabilitar RLS
-- =====================================================

-- OPCION 1: DESHABILITAR RLS (MÁS SIMPLE)
-- Esto permite acceso completo sin políticas complejas
ALTER TABLE whatsapp_config DISABLE ROW LEVEL SECURITY;

-- OPCION 2: SI PREFIERES MANTENER RLS, CREAR POLÍTICAS PERMISIVAS
-- (Comenta las líneas de arriba y descomenta las de abajo)

/*
-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON whatsapp_config;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON whatsapp_config;

-- Crear política simple para usuarios autenticados
CREATE POLICY "Allow all access for authenticated users" 
ON whatsapp_config 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Política adicional para acceso público (anon)
CREATE POLICY "Enable all access for anon users" 
ON whatsapp_config 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);
*/

-- =====================================================
-- VERIFICAR ESTADO ACTUAL DE WHATSAPP_CONFIG
-- =====================================================

-- Ver si RLS está habilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    forcerowsecurity as rls_forced
FROM pg_tables 
WHERE tablename = 'whatsapp_config';

-- Ver políticas existentes (debería estar vacío)
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'whatsapp_config';

-- =====================================================
-- PRUEBA DE INSERCIÓN
-- =====================================================

-- Después de ejecutar el script de arriba, prueba esto:
/*
INSERT INTO whatsapp_config (phone_number_id, access_token, activo)
VALUES ('test123', 'test_token_12345', true);

SELECT * FROM whatsapp_config;
*/