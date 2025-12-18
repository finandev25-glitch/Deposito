-- =====================================================
-- DIAGNÓSTICO DE RLS Y CONSTRAINTS WHATSAPP_CONFIG
-- =====================================================

-- 1. Ver políticas RLS activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'whatsapp_config';

-- 2. Ver constraints y triggers
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'whatsapp_config'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 3. Ver índices únicos
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'whatsapp_config';

-- 4. Verificar si RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'whatsapp_config';

-- 5. Intentar inserción manual simple para probar
-- (Ejecutar solo si es seguro)
-- INSERT INTO whatsapp_config (alias, phone_number_id, access_token, activo) 
-- VALUES ('TEST_MANUAL', '123456789', 'test_token_123', false);

-- 6. Ver datos existentes
SELECT id, alias, phone_number_id, activo, creado_en 
FROM whatsapp_config 
ORDER BY creado_en DESC 
LIMIT 5;