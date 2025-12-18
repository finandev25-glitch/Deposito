-- ================================================================
-- AGREGAR COLUMNA PARA CLASIFICACIÓN MANUAL DE DEPÓSITOS ANTIGUOS
-- Permite al usuario marcar depósitos como antiguos manualmente
-- ================================================================

-- 1. Agregar columna 'es_antiguo' a la tabla depositos
ALTER TABLE public.depositos
ADD COLUMN IF NOT EXISTS es_antiguo BOOLEAN DEFAULT FALSE;

-- 2. Crear índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_depositos_es_antiguo
ON public.depositos(es_antiguo)
WHERE es_antiguo = TRUE;

-- 3. Trigger para limpiar es_antiguo cuando cambia a validado/rechazado
CREATE OR REPLACE FUNCTION reset_es_antiguo_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si cambia a 'validado' o 'rechazado', limpiar la marca de antiguo
  IF NEW.estado IN ('validado', 'rechazado') AND OLD.estado IN ('pendiente', 'en_validacion') THEN
    NEW.es_antiguo = FALSE;
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_reset_es_antiguo ON public.depositos;
CREATE TRIGGER trigger_reset_es_antiguo
  BEFORE UPDATE ON public.depositos
  FOR EACH ROW
  EXECUTE FUNCTION reset_es_antiguo_on_completion();

COMMENT ON COLUMN public.depositos.es_antiguo IS 'Marca manual que indica si el depósito es antiguo/atrasado (solo para pendiente y en_validacion)';
COMMENT ON FUNCTION reset_es_antiguo_on_completion() IS 'Limpia la marca de antiguo cuando se confirma o rechaza el depósito';
