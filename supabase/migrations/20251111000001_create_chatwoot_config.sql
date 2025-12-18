-- =====================================================
-- MIGRACIÓN CHATWOOT CONFIGURACIÓN
-- Fecha: 2025-11-11
-- Descripción: Tabla para configuraciones de ChatWoot
-- =====================================================

-- 1. Crear tabla de configuración ChatWoot
CREATE TABLE IF NOT EXISTS chatwoot_config (
    id SERIAL PRIMARY KEY,
    alias TEXT NOT NULL,
    descripcion TEXT,
    chatwoot_url TEXT NOT NULL,
    api_token TEXT NOT NULL,
    account_id TEXT NOT NULL,
    inbox_id TEXT,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chatwoot_config_alias_unique UNIQUE (alias),
    CONSTRAINT chatwoot_config_url_check CHECK (chatwoot_url ~ '^https?://'),
    CONSTRAINT chatwoot_config_alias_length CHECK (char_length(alias) >= 3),
    CONSTRAINT chatwoot_config_api_token_length CHECK (char_length(api_token) >= 10)
);

-- 2. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_chatwoot_config_activo 
    ON chatwoot_config(activo);
CREATE INDEX IF NOT EXISTS idx_chatwoot_config_creado_en 
    ON chatwoot_config(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_chatwoot_config_alias 
    ON chatwoot_config(alias);

-- 3. Configurar RLS (Row Level Security)
ALTER TABLE chatwoot_config ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de seguridad
CREATE POLICY "Solo admins pueden gestionar ChatWoot" ON chatwoot_config
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.rol = 'admin'
    )
);

-- 5. Función para obtener configuración activa de ChatWoot
CREATE OR REPLACE FUNCTION get_active_chatwoot_config()
RETURNS TABLE (
    id INTEGER,
    alias TEXT,
    descripcion TEXT,
    chatwoot_url TEXT,
    api_token TEXT,
    account_id TEXT,
    inbox_id TEXT
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        cc.id,
        cc.alias,
        cc.descripcion,
        cc.chatwoot_url,
        cc.api_token,
        cc.account_id,
        cc.inbox_id
    FROM chatwoot_config cc 
    WHERE cc.activo = true 
    ORDER BY cc.actualizado_en DESC 
    LIMIT 1;
$$;

-- 6. Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_chatwoot_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para actualizar timestamp automáticamente
CREATE TRIGGER update_chatwoot_config_timestamp
    BEFORE UPDATE ON chatwoot_config
    FOR EACH ROW
    EXECUTE FUNCTION update_chatwoot_timestamp();

-- 8. Otorgar permisos para las funciones
GRANT EXECUTE ON FUNCTION get_active_chatwoot_config() TO authenticated;
GRANT EXECUTE ON FUNCTION update_chatwoot_timestamp() TO authenticated;

-- 9. Comentarios para documentación
COMMENT ON TABLE chatwoot_config IS 'Configuración de ChatWoot para integración de chat de atención al cliente';
COMMENT ON COLUMN chatwoot_config.alias IS 'Nombre identificativo de la configuración';
COMMENT ON COLUMN chatwoot_config.chatwoot_url IS 'URL base de la instancia ChatWoot';
COMMENT ON COLUMN chatwoot_config.api_token IS 'Token de acceso para la API de ChatWoot';
COMMENT ON COLUMN chatwoot_config.account_id IS 'ID de la cuenta en ChatWoot';
COMMENT ON COLUMN chatwoot_config.inbox_id IS 'ID del inbox específico (opcional)';
COMMENT ON COLUMN chatwoot_config.activo IS 'Estado activo/inactivo de la configuración';

-- =====================================================
-- DATOS DE EJEMPLO (opcional)
-- =====================================================
/*
-- Insertar configuración de ejemplo
INSERT INTO chatwoot_config (
    alias, 
    descripcion, 
    chatwoot_url, 
    api_token, 
    account_id, 
    inbox_id, 
    activo
) VALUES (
    'ChatWoot Principal',
    'Configuración principal para atención al cliente',
    'https://tu-chatwoot.com',
    'tu_api_token_aqui',
    '1',
    '1',
    true
) ON CONFLICT (alias) DO NOTHING;
*/