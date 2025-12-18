-- =====================================================
-- AJUSTAR LÍMITES DE CARACTERES PARA TOKENS LARGOS
-- =====================================================

-- 1. Ver estructura actual de la tabla
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_config'
ORDER BY ordinal_position;

-- 2. Ajustar columna access_token para soportar tokens largos
ALTER TABLE whatsapp_config 
ALTER COLUMN access_token TYPE TEXT;

-- 3. Ajustar phone_number_id por si acaso
ALTER TABLE whatsapp_config 
ALTER COLUMN phone_number_id TYPE TEXT;

-- 4. Verificar cambios
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_config'
AND column_name IN ('access_token', 'phone_number_id', 'alias', 'descripcion')
ORDER BY ordinal_position;

-- 5. Ver datos existentes para verificar
SELECT id, alias, char_length(access_token) as token_length, 
       char_length(phone_number_id) as phone_id_length,
       activo, creado_en 
FROM whatsapp_config 
ORDER BY creado_en DESC;