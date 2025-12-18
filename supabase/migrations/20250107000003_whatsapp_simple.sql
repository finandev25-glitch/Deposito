-- =====================================================
-- SCRIPT SIMPLE WHATSAPP - SOLO ENVÍO DE MENSAJES
-- Fecha: 2025-01-07
-- Descripción: Configuración mínima para WhatsApp Business
-- =====================================================

-- 1. Tabla de configuración WhatsApp (versión simple)
CREATE TABLE IF NOT EXISTS configuracion_whatsapp (
    id SERIAL PRIMARY KEY,
    phone_number_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    estado BOOLEAN DEFAULT true,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de logs de mensajes (versión simple)
CREATE TABLE IF NOT EXISTS whatsapp_mensajes_log (
    id SERIAL PRIMARY KEY,
    telefono_destino TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    message_id TEXT,
    estado TEXT DEFAULT 'enviado',
    enviado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices básicos
CREATE INDEX IF NOT EXISTS idx_configuracion_whatsapp_estado ON configuracion_whatsapp(estado);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensajes_log_enviado_en ON whatsapp_mensajes_log(enviado_en DESC);

-- 4. RLS - Solo administradores
ALTER TABLE configuracion_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_mensajes_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admins pueden gestionar WhatsApp" ON configuracion_whatsapp
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.rol = 'admin'
    )
);

CREATE POLICY "Solo usuarios autenticados pueden ver logs" ON whatsapp_mensajes_log
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo usuarios autenticados pueden insertar logs" ON whatsapp_mensajes_log
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Función para obtener configuración
CREATE OR REPLACE FUNCTION get_whatsapp_config()
RETURNS TABLE (phone_number_id TEXT, access_token TEXT) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT phone_number_id, access_token 
    FROM configuracion_whatsapp 
    WHERE estado = true 
    ORDER BY actualizado_en DESC 
    LIMIT 1;
$$;

-- 6. Función para registrar mensaje enviado
CREATE OR REPLACE FUNCTION log_whatsapp_message(
    p_telefono TEXT,
    p_mensaje TEXT,
    p_message_id TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id INTEGER;
BEGIN
    INSERT INTO whatsapp_mensajes_log (telefono_destino, mensaje, message_id)
    VALUES (p_telefono, p_mensaje, p_message_id)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- 7. Trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_configuracion_timestamp
    BEFORE UPDATE ON configuracion_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- 8. Grant permisos
GRANT EXECUTE ON FUNCTION get_whatsapp_config() TO authenticated;
GRANT EXECUTE ON FUNCTION log_whatsapp_message(TEXT, TEXT, TEXT) TO authenticated;

-- =====================================================
-- EJEMPLO DE USO:
-- =====================================================

-- Insertar configuración inicial (descomenta y ajusta):
/*
INSERT INTO configuracion_whatsapp (phone_number_id, access_token) 
VALUES ('TU_PHONE_NUMBER_ID', 'TU_ACCESS_TOKEN');
*/

-- Obtener configuración:
-- SELECT * FROM get_whatsapp_config();

-- Registrar mensaje enviado:
-- SELECT log_whatsapp_message('51987654321', 'Mensaje de prueba', 'msg_id_123');

-- Ver logs recientes:
-- SELECT * FROM whatsapp_mensajes_log ORDER BY enviado_en DESC LIMIT 10;