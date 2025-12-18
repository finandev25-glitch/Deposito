-- Script para actualizar la configuración de ejemplo de ChatWoot
-- Ejecutar después de la migración inicial

-- Actualizar la configuración demo con datos más realistas
UPDATE chatwoot_config 
SET 
  alias = 'ChatWoot Principal',
  descripcion = 'Configuración principal para atención al cliente via ChatWoot',
  chatwoot_url = 'https://tu-instancia.chatwoot.com',
  api_token = 'TU_API_TOKEN_AQUI',
  account_id = '1',
  inbox_id = '1',
  activo = true,
  actualizado_en = NOW()
WHERE alias = 'ChatWoot Demo';

-- O insertar una nueva configuración personalizada
INSERT INTO chatwoot_config (
    alias, 
    descripcion, 
    chatwoot_url, 
    api_token, 
    account_id, 
    inbox_id, 
    activo
) VALUES (
    'ChatWoot Producción',
    'Configuración para el entorno de producción',
    'https://chat.tuempresa.com',
    'TU_TOKEN_PRODUCCION_AQUI',
    '1',
    '1',
    false  -- Mantener inactivo hasta configurar correctamente
) ON CONFLICT (alias) DO NOTHING;

-- Verificar las configuraciones
SELECT 
    id,
    alias,
    descripcion,
    chatwoot_url,
    LEFT(api_token, 10) || '...' as api_token_preview,
    account_id,
    inbox_id,
    activo,
    creado_en,
    actualizado_en
FROM chatwoot_config 
ORDER BY activo DESC, creado_en DESC;