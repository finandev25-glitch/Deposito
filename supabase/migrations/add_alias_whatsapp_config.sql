-- =====================================================
-- AGREGAR ALIAS A WHATSAPP_CONFIG
-- Permitir múltiples configuraciones con nombres descriptivos
-- =====================================================

-- 1. Agregar columna alias/nombre
ALTER TABLE whatsapp_config 
ADD COLUMN alias VARCHAR(100);

-- 2. Agregar columna descripción opcional
ALTER TABLE whatsapp_config 
ADD COLUMN descripcion TEXT;

-- 3. Hacer alias obligatorio y único cuando está activo
ALTER TABLE whatsapp_config 
ADD CONSTRAINT alias_not_empty CHECK (char_length(trim(alias)) > 0);

-- 4. Crear índice único para alias + activo (solo un activo por alias)
CREATE UNIQUE INDEX idx_whatsapp_config_alias_activo 
ON whatsapp_config (alias) 
WHERE activo = true;

-- 5. Actualizar registros existentes con alias por defecto
UPDATE whatsapp_config 
SET alias = 'Principal', 
    descripcion = 'Configuración principal de WhatsApp'
WHERE alias IS NULL;

-- 6. Hacer alias NOT NULL después de actualizar
ALTER TABLE whatsapp_config 
ALTER COLUMN alias SET NOT NULL;

-- =====================================================
-- FUNCIÓN ACTUALIZADA PARA OBTENER POR ALIAS
-- =====================================================

-- 7. Función para obtener configuración por alias
CREATE OR REPLACE FUNCTION get_whatsapp_credentials_by_alias(config_alias TEXT DEFAULT 'Principal')
RETURNS TABLE (
    phone_number_id TEXT,
    access_token TEXT,
    alias TEXT,
    descripcion TEXT
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        wc.phone_number_id,
        wc.access_token,
        wc.alias,
        wc.descripcion
    FROM whatsapp_config wc 
    WHERE wc.activo = true 
    AND wc.alias = config_alias
    LIMIT 1;
$$;

-- 8. Eliminar función existente y recrear con nueva estructura
DROP FUNCTION IF EXISTS get_whatsapp_credentials();

-- Función para obtener la configuración activa principal (fallback)
CREATE OR REPLACE FUNCTION get_whatsapp_credentials()
RETURNS TABLE (
    phone_number_id TEXT,
    access_token TEXT,
    alias TEXT,
    descripcion TEXT
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        wc.phone_number_id,
        wc.access_token,
        wc.alias,
        wc.descripcion
    FROM whatsapp_config wc 
    WHERE wc.activo = true 
    ORDER BY wc.creado_en DESC 
    LIMIT 1;
$$;

-- 9. Función para listar todas las configuraciones
CREATE OR REPLACE FUNCTION list_whatsapp_configs()
RETURNS TABLE (
    id INTEGER,
    alias TEXT,
    descripcion TEXT,
    phone_number_id TEXT,
    activo BOOLEAN,
    creado_en TIMESTAMP
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        wc.id,
        wc.alias,
        wc.descripcion,
        wc.phone_number_id,
        wc.activo,
        wc.creado_en
    FROM whatsapp_config wc 
    ORDER BY wc.activo DESC, wc.creado_en DESC;
$$;

-- =====================================================
-- PERMISOS PARA LAS FUNCIONES
-- =====================================================

-- 10. Otorgar permisos para las nuevas funciones
GRANT EXECUTE ON FUNCTION get_whatsapp_credentials_by_alias(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_whatsapp_credentials() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_whatsapp_configs() TO anon, authenticated;

-- =====================================================
-- VERIFICAR CAMBIOS
-- =====================================================

-- Ver estructura actualizada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_config'
ORDER BY ordinal_position;

-- Ver datos actualizados
SELECT id, alias, descripcion, phone_number_id, activo, creado_en 
FROM whatsapp_config 
ORDER BY creado_en DESC;

COMMIT;