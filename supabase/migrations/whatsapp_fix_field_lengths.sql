-- =====================================================
-- FIX LONGITUD CAMPOS WHATSAPP_CONFIG
-- Ajustar campos TEXT para soportar tokens largos
-- =====================================================

-- 1. Ver estructura actual de la tabla
-- \d+ whatsapp_config;

-- 2. Los campos TEXT en PostgreSQL ya soportan hasta ~1GB
-- Pero vamos a ser explícitos para asegurar compatibilidad

-- 3. Modificar campos para asegurar longitud suficiente
ALTER TABLE public.whatsapp_config 
ALTER COLUMN phone_number_id TYPE TEXT;

ALTER TABLE public.whatsapp_config 
ALTER COLUMN access_token TYPE TEXT;

-- 4. Agregar constraints para validar longitud mínima y máxima
ALTER TABLE public.whatsapp_config 
ADD CONSTRAINT phone_number_id_length_check 
CHECK (char_length(phone_number_id) >= 5 AND char_length(phone_number_id) <= 100);

ALTER TABLE public.whatsapp_config 
ADD CONSTRAINT access_token_length_check 
CHECK (char_length(access_token) >= 10 AND char_length(access_token) <= 500);

-- 5. Verificar cambios
-- SELECT 
--     column_name, 
--     data_type, 
--     character_maximum_length,
--     is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'whatsapp_config';

-- =====================================================
-- INFORMACIÓN SOBRE LONGITUDES TÍPICAS:
-- =====================================================

-- Phone Number ID: ~15-25 caracteres (ej: "123456789012345")
-- Access Token: ~200-400 caracteres (ej: "EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...")

-- TEXT en PostgreSQL soporta hasta ~1 GB, así que no hay problema de longitud

-- =====================================================
-- PRUEBA DE INSERCIÓN CON TOKEN LARGO:
-- =====================================================

-- Prueba con un token simulado largo (descomenta para probar):
/*
INSERT INTO public.whatsapp_config (phone_number_id, access_token, activo) 
VALUES (
    '123456789012345',
    'EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    true
);
*/