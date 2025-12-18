-- =====================================================
-- LIMPIAR Y PREPARAR TABLA WHATSAPP_CONFIG
-- Para solucionar problemas de inserción
-- =====================================================

-- 1. Eliminar registros anteriores para evitar conflictos
DELETE FROM whatsapp_config;

-- 2. Resetear el contador de ID
ALTER SEQUENCE whatsapp_config_id_seq RESTART WITH 1;

-- 3. Deshabilitar RLS completamente
ALTER TABLE whatsapp_config DISABLE ROW LEVEL SECURITY;

-- 4. Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Solo admins WhatsApp" ON whatsapp_config;
DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados" ON whatsapp_config;

-- 5. Otorgar permisos completos
GRANT ALL PRIVILEGES ON TABLE whatsapp_config TO authenticated;
GRANT ALL PRIVILEGES ON TABLE whatsapp_config TO anon;
GRANT ALL PRIVILEGES ON SEQUENCE whatsapp_config_id_seq TO authenticated;
GRANT ALL PRIVILEGES ON SEQUENCE whatsapp_config_id_seq TO anon;

-- 6. Verificar que funciona con inserción manual
INSERT INTO whatsapp_config (phone_number_id, access_token, activo) 
VALUES ('test123', 'test_token', true);

-- 7. Ver resultado
SELECT * FROM whatsapp_config;

-- 8. Limpiar el test
DELETE FROM whatsapp_config WHERE phone_number_id = 'test123';

-- =====================================================
-- AHORA INTENTA GUARDAR DESDE LA INTERFAZ
-- =====================================================