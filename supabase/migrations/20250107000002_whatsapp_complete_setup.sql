-- =====================================================
-- MIGRACIÓN COMPLETA WHATSAPP BUSINESS CLOUD API
-- Fecha: 2025-01-07
-- Descripción: Configuración completa para WhatsApp Business
-- =====================================================

-- 1. Crear tabla de configuración WhatsApp (si no existe)
CREATE TABLE IF NOT EXISTS configuracion_whatsapp (
    id SERIAL PRIMARY KEY,
    phone_number_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    webhook_url TEXT,
    verify_token TEXT,
    business_account_id TEXT,
    app_id TEXT,
    app_secret TEXT,
    estado BOOLEAN DEFAULT true,
    nombre_configuracion TEXT DEFAULT 'Principal',
    descripcion TEXT,
    actualizado_por UUID REFERENCES auth.users(id),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT configuracion_whatsapp_phone_number_id_check 
        CHECK (char_length(phone_number_id) > 5),
    CONSTRAINT configuracion_whatsapp_access_token_check 
        CHECK (char_length(access_token) > 10)
);

-- 2. Crear tabla de logs de mensajes WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_mensajes_log (
    id SERIAL PRIMARY KEY,
    configuracion_id INTEGER REFERENCES configuracion_whatsapp(id) ON DELETE CASCADE,
    telefono_destino TEXT NOT NULL,
    tipo_mensaje TEXT NOT NULL CHECK (tipo_mensaje IN ('text', 'template', 'document', 'image')),
    contenido JSONB NOT NULL,
    message_id TEXT, -- ID devuelto por WhatsApp
    estado TEXT DEFAULT 'enviando' CHECK (estado IN ('enviando', 'enviado', 'entregado', 'leido', 'fallido')),
    error_mensaje TEXT,
    metadata JSONB, -- Información adicional (depósito_id, etc.)
    enviado_por UUID REFERENCES auth.users(id),
    enviado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT whatsapp_mensajes_log_telefono_check 
        CHECK (char_length(telefono_destino) >= 10)
);

-- 3. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_configuracion_whatsapp_estado 
    ON configuracion_whatsapp(estado);
CREATE INDEX IF NOT EXISTS idx_configuracion_whatsapp_phone_number 
    ON configuracion_whatsapp(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensajes_log_estado 
    ON whatsapp_mensajes_log(estado);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensajes_log_telefono 
    ON whatsapp_mensajes_log(telefono_destino);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensajes_log_enviado_en 
    ON whatsapp_mensajes_log(enviado_en DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensajes_log_message_id 
    ON whatsapp_mensajes_log(message_id);

-- 4. Configurar RLS (Row Level Security)
ALTER TABLE configuracion_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_mensajes_log ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de seguridad - Solo administradores
CREATE POLICY "Solo admins pueden gestionar configuración WhatsApp" ON configuracion_whatsapp
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.rol = 'admin'
    )
);

CREATE POLICY "Solo admins pueden ver logs de WhatsApp" ON whatsapp_mensajes_log
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.rol = 'admin'
    )
);

CREATE POLICY "Solo usuarios autenticados pueden insertar logs" ON whatsapp_mensajes_log
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Función para obtener configuración activa
CREATE OR REPLACE FUNCTION get_whatsapp_config()
RETURNS TABLE (
    id INTEGER,
    phone_number_id TEXT,
    access_token TEXT,
    webhook_url TEXT,
    verify_token TEXT,
    business_account_id TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cw.id,
        cw.phone_number_id,
        cw.access_token,
        cw.webhook_url,
        cw.verify_token,
        cw.business_account_id
    FROM configuracion_whatsapp cw
    WHERE cw.estado = true
    ORDER BY cw.actualizado_en DESC
    LIMIT 1;
END;
$$;

-- 7. Función para validar configuración WhatsApp
CREATE OR REPLACE FUNCTION validate_whatsapp_config(
    p_phone_number_id TEXT,
    p_access_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validaciones básicas
    IF p_phone_number_id IS NULL OR char_length(p_phone_number_id) < 5 THEN
        RETURN FALSE;
    END IF;
    
    IF p_access_token IS NULL OR char_length(p_access_token) < 10 THEN
        RETURN FALSE;
    END IF;
    
    -- Validar formato del phone_number_id (solo números)
    IF p_phone_number_id !~ '^[0-9]+$' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- 8. Función para registrar envío de mensaje
CREATE OR REPLACE FUNCTION log_whatsapp_message(
    p_telefono_destino TEXT,
    p_tipo_mensaje TEXT,
    p_contenido JSONB,
    p_message_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_configuracion_id INTEGER;
    v_log_id INTEGER;
BEGIN
    -- Obtener la configuración activa
    SELECT id INTO v_configuracion_id
    FROM configuracion_whatsapp
    WHERE estado = true
    ORDER BY actualizado_en DESC
    LIMIT 1;
    
    IF v_configuracion_id IS NULL THEN
        RAISE EXCEPTION 'No hay configuración WhatsApp activa';
    END IF;
    
    -- Insertar log del mensaje
    INSERT INTO whatsapp_mensajes_log (
        configuracion_id,
        telefono_destino,
        tipo_mensaje,
        contenido,
        message_id,
        metadata,
        enviado_por
    ) VALUES (
        v_configuracion_id,
        p_telefono_destino,
        p_tipo_mensaje,
        p_contenido,
        p_message_id,
        p_metadata,
        auth.uid()
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- 9. Función para actualizar estado de mensaje
CREATE OR REPLACE FUNCTION update_whatsapp_message_status(
    p_message_id TEXT,
    p_estado TEXT,
    p_error_mensaje TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE whatsapp_mensajes_log
    SET 
        estado = p_estado,
        error_mensaje = p_error_mensaje,
        actualizado_en = NOW()
    WHERE message_id = p_message_id;
    
    RETURN FOUND;
END;
$$;

-- 10. Función para obtener estadísticas de mensajes
CREATE OR REPLACE FUNCTION get_whatsapp_stats(
    p_fecha_inicio DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_fecha_fin DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_mensajes BIGINT,
    mensajes_enviados BIGINT,
    mensajes_entregados BIGINT,
    mensajes_fallidos BIGINT,
    tasa_exito NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_mensajes,
        COUNT(*) FILTER (WHERE estado IN ('enviado', 'entregado', 'leido')) as mensajes_enviados,
        COUNT(*) FILTER (WHERE estado IN ('entregado', 'leido')) as mensajes_entregados,
        COUNT(*) FILTER (WHERE estado = 'fallido') as mensajes_fallidos,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(
                    (COUNT(*) FILTER (WHERE estado IN ('enviado', 'entregado', 'leido'))::NUMERIC / COUNT(*)::NUMERIC) * 100, 
                    2
                )
            ELSE 0
        END as tasa_exito
    FROM whatsapp_mensajes_log
    WHERE DATE(enviado_en) BETWEEN p_fecha_inicio AND p_fecha_fin;
END;
$$;

-- 11. Trigger para actualizar timestamp en configuración
CREATE OR REPLACE FUNCTION update_configuracion_whatsapp_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.actualizado_en = NOW();
    NEW.actualizado_por = auth.uid();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_configuracion_whatsapp_timestamp ON configuracion_whatsapp;
CREATE TRIGGER update_configuracion_whatsapp_timestamp
    BEFORE UPDATE ON configuracion_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION update_configuracion_whatsapp_timestamp();

-- 12. Trigger para validar configuración antes de insertar/actualizar
CREATE OR REPLACE FUNCTION validate_whatsapp_config_trigger()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT validate_whatsapp_config(NEW.phone_number_id, NEW.access_token) THEN
        RAISE EXCEPTION 'Configuración WhatsApp inválida: phone_number_id o access_token no cumplen los requisitos';
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_whatsapp_config_trigger ON configuracion_whatsapp;
CREATE TRIGGER validate_whatsapp_config_trigger
    BEFORE INSERT OR UPDATE ON configuracion_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION validate_whatsapp_config_trigger();

-- 13. Insertar configuración por defecto (comentado - descomentar según necesidad)
/*
INSERT INTO configuracion_whatsapp (
    phone_number_id,
    access_token,
    nombre_configuracion,
    descripcion
) VALUES (
    '1234567890', -- Reemplazar con el ID real
    'EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', -- Reemplazar con token real
    'Configuración Principal',
    'Configuración principal para envío de notificaciones'
) ON CONFLICT (phone_number_id) DO NOTHING;
*/

-- 14. Comentarios para documentación
COMMENT ON TABLE configuracion_whatsapp IS 'Configuración de WhatsApp Business Cloud API para envío de mensajes';
COMMENT ON TABLE whatsapp_mensajes_log IS 'Log de todos los mensajes enviados via WhatsApp';

COMMENT ON COLUMN configuracion_whatsapp.phone_number_id IS 'ID del número de teléfono de WhatsApp Business (único)';
COMMENT ON COLUMN configuracion_whatsapp.access_token IS 'Token de acceso para la API de WhatsApp';
COMMENT ON COLUMN configuracion_whatsapp.business_account_id IS 'ID de la cuenta de negocio de WhatsApp';
COMMENT ON COLUMN configuracion_whatsapp.estado IS 'Estado activo/inactivo de la configuración';

COMMENT ON COLUMN whatsapp_mensajes_log.message_id IS 'ID del mensaje devuelto por WhatsApp API';
COMMENT ON COLUMN whatsapp_mensajes_log.contenido IS 'Contenido del mensaje en formato JSON';
COMMENT ON COLUMN whatsapp_mensajes_log.metadata IS 'Información adicional (depósito_id, usuario, etc.)';
COMMENT ON COLUMN whatsapp_mensajes_log.estado IS 'Estado del mensaje: enviando, enviado, entregado, leído, fallido';

-- 15. Grant de permisos para funciones públicas
GRANT EXECUTE ON FUNCTION get_whatsapp_config() TO authenticated;
GRANT EXECUTE ON FUNCTION log_whatsapp_message(TEXT, TEXT, JSONB, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_whatsapp_message_status(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_whatsapp_stats(DATE, DATE) TO authenticated;

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================

-- Para verificar la instalación, ejecutar:
-- SELECT * FROM configuracion_whatsapp;
-- SELECT * FROM whatsapp_mensajes_log ORDER BY enviado_en DESC LIMIT 5;
-- SELECT get_whatsapp_stats();