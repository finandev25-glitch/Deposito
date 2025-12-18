-- =====================================================
-- FIX DEFINITIVO PARA WHATSAPP_CONFIG
-- Basado en el esquema actual de la base de datos
-- =====================================================

-- 1. Verificar y crear la función si no existe
CREATE OR REPLACE FUNCTION get_whatsapp_credentials()
RETURNS TABLE (phone_number_id TEXT, access_token TEXT) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT phone_number_id, access_token 
    FROM public.whatsapp_config 
    WHERE activo = true 
    ORDER BY id DESC
    LIMIT 1;
$$;

-- 2. Deshabilitar RLS para permitir acceso completo
ALTER TABLE public.whatsapp_config DISABLE ROW LEVEL SECURITY;

-- 3. Otorgar permisos completos a usuarios autenticados
GRANT ALL ON TABLE public.whatsapp_config TO authenticated;
GRANT ALL ON TABLE public.whatsapp_config TO anon;
GRANT USAGE, SELECT ON SEQUENCE whatsapp_config_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE whatsapp_config_id_seq TO anon;

-- 4. Otorgar permisos de ejecución en la función
GRANT EXECUTE ON FUNCTION get_whatsapp_credentials() TO authenticated;
GRANT EXECUTE ON FUNCTION get_whatsapp_credentials() TO anon;

-- 5. Limpiar datos anteriores si existen (opcional)
-- DELETE FROM public.whatsapp_config WHERE activo = false;

-- =====================================================
-- VERIFICACIÓN - Ejecutar estos comandos para probar:
-- =====================================================

-- Verificar estructura de la tabla
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'whatsapp_config';

-- Probar inserción
-- INSERT INTO public.whatsapp_config (phone_number_id, access_token, activo) VALUES ('test123', 'test_access_token', true);

-- Probar función
-- SELECT * FROM get_whatsapp_credentials();

-- Ver todos los registros
-- SELECT * FROM public.whatsapp_config;