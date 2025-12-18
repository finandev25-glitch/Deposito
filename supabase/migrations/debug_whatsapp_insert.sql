-- =====================================================
-- PRUEBA DIRECTA DE INSERCIÓN WHATSAPP
-- Para verificar si el problema es la tabla o los permisos
-- =====================================================

-- 1. Verificar estructura actual
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'whatsapp_config';

-- 2. Verificar permisos actuales
SELECT has_table_privilege('authenticated', 'whatsapp_config', 'INSERT') as can_insert;
SELECT has_table_privilege('authenticated', 'whatsapp_config', 'UPDATE') as can_update;

-- 3. Ver RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'whatsapp_config';

-- 4. Ver registros actuales
SELECT * FROM whatsapp_config;

-- 5. Probar inserción manual (EJECUTAR SOLO SI LOS PASOS ANTERIORES FUNCIONAN)
/*
INSERT INTO whatsapp_config (phone_number_id, access_token, activo) 
VALUES ('test123', 'test_token_largo_para_probar_funcionamiento', true);
*/

-- 6. Si hay problemas, ejecutar estos fixes:
/*
-- Deshabilitar RLS temporalmente
ALTER TABLE whatsapp_config DISABLE ROW LEVEL SECURITY;

-- Dar permisos completos
GRANT ALL ON TABLE whatsapp_config TO authenticated;
GRANT ALL ON TABLE whatsapp_config TO anon;
GRANT USAGE ON SEQUENCE whatsapp_config_id_seq TO authenticated;

-- Limpiar constraints problemáticos
ALTER TABLE whatsapp_config DROP CONSTRAINT IF EXISTS access_token_length_check;
*/