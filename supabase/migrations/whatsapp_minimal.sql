-- =====================================================
-- WHATSAPP SOLO ENVÍO DE MENSAJES
-- Script mínimo para enviar mensajes via WhatsApp API
-- =====================================================

-- 1. Tabla de configuración WhatsApp (mínima)
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id SERIAL PRIMARY KEY,
    phone_number_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW()
);

-- 2. Solo admins pueden acceder
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admins WhatsApp" ON whatsapp_config
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.rol = 'admin'
    )
);

-- 3. Función para obtener configuración
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

-- 4. Grant permiso
GRANT EXECUTE ON FUNCTION get_whatsapp_credentials() TO authenticated;

-- =====================================================
-- USO:
-- =====================================================

-- 1. Insertar configuración (ejecutar una sola vez):
-- INSERT INTO whatsapp_config (phone_number_id, access_token) 
-- VALUES ('TU_PHONE_NUMBER_ID', 'TU_ACCESS_TOKEN');

-- 2. Obtener credenciales desde tu código:
-- SELECT * FROM get_whatsapp_credentials();