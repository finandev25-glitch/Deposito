-- =====================================================
-- FIX PERMISOS WHATSAPP CONFIG
-- Solución para problemas de permisos en whatsapp_config
-- =====================================================

-- 1. Deshabilitar RLS temporalmente para debugging
ALTER TABLE whatsapp_config DISABLE ROW LEVEL SECURITY;

-- 2. Dar permisos directos a usuarios autenticados
GRANT ALL ON TABLE whatsapp_config TO authenticated;
GRANT USAGE ON SEQUENCE whatsapp_config_id_seq TO authenticated;

-- 3. Verificar que la tabla existe y tiene datos
-- SELECT * FROM whatsapp_config;

-- 4. Si quieres volver a habilitar RLS después (opcional):
-- ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Permitir todo a usuarios autenticados" ON whatsapp_config FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- COMANDOS DE VERIFICACIÓN:
-- =====================================================

-- Ver estructura de la tabla:
-- \d whatsapp_config

-- Ver permisos:
-- \dp whatsapp_config

-- Probar inserción manual:
-- INSERT INTO whatsapp_config (phone_number_id, access_token) VALUES ('test123', 'test_token');