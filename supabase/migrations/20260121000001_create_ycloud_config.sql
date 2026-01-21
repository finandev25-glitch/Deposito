-- =====================================================
-- MIGRACIÓN YCLOUD CONFIGURACIÓN
-- Fecha: 2026-01-21
-- Descripción: Tabla para configuraciones de YCloud WhatsApp API
-- =====================================================

-- 1. Crear tabla de configuración YCloud
CREATE TABLE IF NOT EXISTS ycloud_config (
    id SERIAL PRIMARY KEY,
    alias TEXT NOT NULL,
    descripcion TEXT,
    api_key TEXT NOT NULL,
    waba_id TEXT,                    -- WhatsApp Business Account ID (opcional)
    phone_number_id TEXT,            -- ID del número de teléfono (opcional)
    default_from_number TEXT,        -- Número de WhatsApp por defecto para envíos
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT ycloud_config_alias_unique UNIQUE (alias),
    CONSTRAINT ycloud_config_alias_length CHECK (char_length(alias) >= 3),
    CONSTRAINT ycloud_config_api_key_length CHECK (char_length(api_key) >= 10)
);

-- 2. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_ycloud_config_activo
    ON ycloud_config(activo);
CREATE INDEX IF NOT EXISTS idx_ycloud_config_creado_en
    ON ycloud_config(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_ycloud_config_alias
    ON ycloud_config(alias);

-- 3. Configurar RLS (Row Level Security)
ALTER TABLE ycloud_config ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de seguridad
CREATE POLICY "Solo admins pueden gestionar YCloud" ON ycloud_config
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.rol = 'admin'
    )
);

-- 5. Función para obtener configuración activa de YCloud
CREATE OR REPLACE FUNCTION get_active_ycloud_config()
RETURNS TABLE (
    id INTEGER,
    alias TEXT,
    descripcion TEXT,
    api_key TEXT,
    waba_id TEXT,
    phone_number_id TEXT,
    default_from_number TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        yc.id,
        yc.alias,
        yc.descripcion,
        yc.api_key,
        yc.waba_id,
        yc.phone_number_id,
        yc.default_from_number
    FROM ycloud_config yc
    WHERE yc.activo = true
    ORDER BY yc.actualizado_en DESC
    LIMIT 1;
$$;

-- 6. Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_ycloud_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para actualizar timestamp automáticamente
CREATE TRIGGER update_ycloud_config_timestamp
    BEFORE UPDATE ON ycloud_config
    FOR EACH ROW
    EXECUTE FUNCTION update_ycloud_timestamp();

-- 8. Otorgar permisos para las funciones
GRANT EXECUTE ON FUNCTION get_active_ycloud_config() TO authenticated;
GRANT EXECUTE ON FUNCTION update_ycloud_timestamp() TO authenticated;

-- 9. Comentarios para documentación
COMMENT ON TABLE ycloud_config IS 'Configuración de YCloud para integración de WhatsApp Business API';
COMMENT ON COLUMN ycloud_config.alias IS 'Nombre identificativo de la configuración';
COMMENT ON COLUMN ycloud_config.api_key IS 'API Key de YCloud (X-API-Key header)';
COMMENT ON COLUMN ycloud_config.waba_id IS 'WhatsApp Business Account ID (opcional)';
COMMENT ON COLUMN ycloud_config.phone_number_id IS 'ID del número de teléfono en YCloud (opcional)';
COMMENT ON COLUMN ycloud_config.default_from_number IS 'Número de WhatsApp por defecto para envíos (formato: +521234567890)';
COMMENT ON COLUMN ycloud_config.activo IS 'Estado activo/inactivo de la configuración';

-- =====================================================
-- DATOS DE EJEMPLO (opcional)
-- =====================================================
/*
-- Insertar configuración de ejemplo
INSERT INTO ycloud_config (
    alias,
    descripcion,
    api_key,
    waba_id,
    phone_number_id,
    default_from_number,
    activo
) VALUES (
    'YCloud Principal',
    'Configuración principal para envío de WhatsApp',
    'tu_api_key_aqui',
    'waba_id_opcional',
    'phone_number_id_opcional',
    '+521234567890',
    true
) ON CONFLICT (alias) DO NOTHING;
*/
