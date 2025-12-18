-- =====================================================
-- WHATSAPP ULTRA SIMPLE - SIN VALIDACIONES
-- Solo para enviar mensajes, sin restricciones
-- =====================================================

-- 1. Tabla de configuración WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id SERIAL PRIMARY KEY,
    phone_number_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW()
);

-- 2. Función para obtener configuración (sin restricciones)
CREATE OR REPLACE FUNCTION get_whatsapp_credentials()
RETURNS TABLE (phone_number_id TEXT, access_token TEXT) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT phone_number_id, access_token 
    FROM whatsapp_config 
    WHERE activo = true 
    LIMIT 1;
$$;

-- 3. Grant permiso a todos los usuarios autenticados
GRANT EXECUTE ON FUNCTION get_whatsapp_credentials() TO authenticated;

-- =====================================================
-- USO INMEDIATO:
-- =====================================================

-- 1. Insertar tu configuración:
INSERT INTO whatsapp_config (phone_number_id, access_token) 
VALUES ('TU_PHONE_NUMBER_ID', 'TU_ACCESS_TOKEN')
ON CONFLICT DO NOTHING;

-- 2. Probar que funciona:
SELECT * FROM get_whatsapp_credentials();