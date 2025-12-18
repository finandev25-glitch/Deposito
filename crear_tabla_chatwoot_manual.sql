-- Ejecutar esta migración manualmente en Supabase
-- =====================================================
-- MIGRACIÓN CHATWOOT CONFIGURACIÓN
-- Fecha: 2025-11-13
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

-- 5. Otorgar permisos básicos
GRANT ALL ON chatwoot_config TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE chatwoot_config_id_seq TO authenticated;

-- 6. Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_chatwoot_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para actualizar timestamp automáticamente
DROP TRIGGER IF EXISTS update_chatwoot_config_timestamp ON chatwoot_config;
CREATE TRIGGER update_chatwoot_config_timestamp
    BEFORE UPDATE ON chatwoot_config
    FOR EACH ROW
    EXECUTE FUNCTION update_chatwoot_timestamp();

-- 8. Insertar configuración de ejemplo (opcional)
INSERT INTO chatwoot_config (
    alias, 
    descripcion, 
    chatwoot_url, 
    api_token, 
    account_id, 
    inbox_id, 
    activo
) VALUES (
    'ChatWoot Demo',
    'Configuración de demostración para ChatWoot',
    'https://demo.chatwoot.com',
    'demo_api_token_placeholder',
    '1',
    '1',
    true
) ON CONFLICT (alias) DO NOTHING;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Verificar que la tabla se creó correctamente
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chatwoot_config' 
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'chatwoot_config';

-- Verificar datos insertados
SELECT 
    id,
    alias,
    descripcion,
    chatwoot_url,
    account_id,
    activo,
    creado_en
FROM chatwoot_config 
ORDER BY creado_en DESC;