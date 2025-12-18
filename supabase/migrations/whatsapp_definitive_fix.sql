-- =====================================================
-- SOLUCION DEFINITIVA WHATSAPP CONFIG
-- Resolver problemas de RLS y permisos
-- =====================================================

-- 1. Eliminar tabla existente y recrear limpia
DROP TABLE IF EXISTS public.whatsapp_config CASCADE;

-- 2. Crear tabla sin RLS inicialmente
CREATE TABLE public.whatsapp_config (
    id SERIAL PRIMARY KEY,
    phone_number_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Agregar índices para performance
CREATE INDEX idx_whatsapp_config_activo ON public.whatsapp_config(activo);
CREATE INDEX idx_whatsapp_config_created ON public.whatsapp_config(created_at);

-- 4. Agregar constraints básicos
ALTER TABLE public.whatsapp_config 
ADD CONSTRAINT phone_number_id_not_empty CHECK (char_length(trim(phone_number_id)) > 0);

ALTER TABLE public.whatsapp_config 
ADD CONSTRAINT access_token_not_empty CHECK (char_length(trim(access_token)) > 0);

-- 5. Función para obtener configuración activa
CREATE OR REPLACE FUNCTION get_whatsapp_credentials()
RETURNS TABLE (
    phone_number_id TEXT,
    access_token TEXT
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        wc.phone_number_id,
        wc.access_token
    FROM public.whatsapp_config wc 
    WHERE wc.activo = true 
    ORDER BY wc.created_at DESC 
    LIMIT 1;
$$;

-- 6. Función para desactivar configuraciones anteriores
CREATE OR REPLACE FUNCTION deactivate_old_whatsapp_configs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    UPDATE public.whatsapp_config 
    SET activo = false, updated_at = NOW()
    WHERE activo = true;
$$;

-- 7. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_config_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_config_update_timestamp
    BEFORE UPDATE ON public.whatsapp_config
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_config_timestamp();

-- 8. Permisos públicos (sin RLS para evitar problemas)
GRANT ALL ON public.whatsapp_config TO anon, authenticated;
GRANT ALL ON SEQUENCE whatsapp_config_id_seq TO anon, authenticated;

-- 9. Permisos para las funciones
GRANT EXECUTE ON FUNCTION get_whatsapp_credentials() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION deactivate_old_whatsapp_configs() TO anon, authenticated;

-- 10. Insertar configuración de prueba (opcional)
-- INSERT INTO public.whatsapp_config (phone_number_id, access_token, activo)
-- VALUES ('test_phone_id', 'test_access_token', true);

-- =====================================================
-- VERIFICACIONES
-- =====================================================

-- Verificar estructura de tabla:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'whatsapp_config';

-- Verificar permisos:
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'whatsapp_config';

-- Probar función:
-- SELECT * FROM get_whatsapp_credentials();

COMMIT;