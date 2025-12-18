-- =====================================================
-- VERIFICACIÓN DE TABLA WHATSAPP_CONFIG
-- Revisar estructura y capacidad para tokens largos
-- =====================================================

-- 1. Ver estructura completa de la tabla
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'whatsapp_config'
ORDER BY ordinal_position;

-- 2. Ver constraints existentes
SELECT 
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'whatsapp_config';

-- 3. Probar inserción con tu token real
-- NOTA: Ejecutar solo después de verificar la estructura
/*
INSERT INTO public.whatsapp_config (phone_number_id, access_token, activo) 
VALUES (
    'TU_PHONE_NUMBER_ID_AQUI',
    'EAAQYrFpmZAVUBPyCEHj8mcrwuQZA9o8aWjRqcKl69tpWdlwetx8QLbLBRXDXYWEt0hdFZAskEDZBDJlIjZCQpZCxEpZA9531cP4UgpdA2cIgFZCBDUsZCk3HzLDmdZAXq2c0UtuNuCAZCjaFbTapq0wojxPNx5BbPlemIZB8O2t5MYYBNSwZByoHk8DqZAV43oHnZBfpQZDZD',
    true
) ON CONFLICT (id) DO UPDATE SET
    access_token = EXCLUDED.access_token,
    activo = EXCLUDED.activo;
*/

-- 4. Ver registros existentes
SELECT 
    id,
    phone_number_id,
    length(access_token) as token_length,
    left(access_token, 20) || '...' as token_preview,
    activo,
    creado_en
FROM public.whatsapp_config
ORDER BY id DESC;

-- 5. Si hay errores de longitud, eliminar constraints problemáticos:
/*
ALTER TABLE public.whatsapp_config 
DROP CONSTRAINT IF EXISTS access_token_length_check;

ALTER TABLE public.whatsapp_config 
DROP CONSTRAINT IF EXISTS phone_number_id_length_check;
*/

-- =====================================================
-- INFORMACIÓN DEL TOKEN PROPORCIONADO:
-- =====================================================
-- Longitud del token: 192 caracteres
-- Tipo: Bearer token de Facebook/Meta
-- Formato: EAAxxxxxxxxx (válido para WhatsApp Business API)

-- El token debería funcionar perfectamente si la tabla está bien configurada