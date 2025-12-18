-- =====================================================
-- FIX DEFINITIVO PARA TOKENS LARGOS DE WHATSAPP
-- Asegurar que la tabla soporte el token proporcionado (192 chars)
-- =====================================================

-- 1. Eliminar constraints que puedan estar limitando la longitud
ALTER TABLE public.whatsapp_config 
DROP CONSTRAINT IF EXISTS access_token_length_check;

ALTER TABLE public.whatsapp_config 
DROP CONSTRAINT IF EXISTS phone_number_id_length_check;

-- 2. Asegurar que los campos sean TEXT sin límites
ALTER TABLE public.whatsapp_config 
ALTER COLUMN phone_number_id TYPE TEXT;

ALTER TABLE public.whatsapp_config 
ALTER COLUMN access_token TYPE TEXT;

-- 3. Agregar constraints más permisivos
ALTER TABLE public.whatsapp_config 
ADD CONSTRAINT access_token_min_length_check 
CHECK (char_length(access_token) >= 50);

ALTER TABLE public.whatsapp_config 
ADD CONSTRAINT phone_number_id_min_length_check 
CHECK (char_length(phone_number_id) >= 5);

-- 4. Limpiar registros anteriores si existen
DELETE FROM public.whatsapp_config WHERE activo = false;

-- 5. Asegurar permisos completos
GRANT ALL ON TABLE public.whatsapp_config TO authenticated;
GRANT ALL ON TABLE public.whatsapp_config TO anon;
GRANT USAGE, SELECT ON SEQUENCE whatsapp_config_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE whatsapp_config_id_seq TO anon;

-- 6. Actualizar función para asegurar compatibilidad
CREATE OR REPLACE FUNCTION get_whatsapp_credentials()
RETURNS TABLE (phone_number_id TEXT, access_token TEXT) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT phone_number_id, access_token 
    FROM public.whatsapp_config 
    WHERE activo = true 
    ORDER BY id DESC
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_whatsapp_credentials() TO authenticated;
GRANT EXECUTE ON FUNCTION get_whatsapp_credentials() TO anon;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Ver estructura actualizada
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'whatsapp_config';

-- Probar con token real (descomenta y ajusta el phone_number_id):
/*
INSERT INTO public.whatsapp_config (phone_number_id, access_token, activo) 
VALUES (
    'TU_PHONE_NUMBER_ID',
    'EAAQYrFpmZAVUBPyCEHj8mcrwuQZA9o8aWjRqcKl69tpWdlwetx8QLbLBRXDXYWEt0hdFZAskEDZBDJlIjZCQpZCxEpZA9531cP4UgpdA2cIgFZCBDUsZCk3HzLDmdZAXq2c0UtuNuCAZCjaFbTapq0wojxPNx5BbPlemIZB8O2t5MYYBNSwZByoHk8DqZAV43oHnZBfpQZDZD',
    true
);
*/