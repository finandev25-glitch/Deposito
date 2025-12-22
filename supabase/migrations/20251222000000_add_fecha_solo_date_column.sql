-- Agregar columna fecha_solo_date a la tabla depositos para optimizar filtros de fecha
-- Esta columna almacenará solo la fecha (YYYY-MM-DD) extraída de fecha_registro

-- Agregar la columna
ALTER TABLE public.depositos 
ADD COLUMN fecha_solo_date DATE;

-- Actualizar registros existentes para popular la nueva columna
-- Extraer solo la fecha de fecha_registro
UPDATE public.depositos 
SET fecha_solo_date = fecha_registro::date 
WHERE fecha_solo_date IS NULL;

-- Crear función trigger para mantener fecha_solo_date sincronizada con fecha_registro
CREATE OR REPLACE FUNCTION update_fecha_solo_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar fecha_solo_date basada en fecha_registro
  NEW.fecha_solo_date := NEW.fecha_registro::date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar automáticamente fecha_solo_date
CREATE TRIGGER trigger_update_fecha_solo_date
    BEFORE INSERT OR UPDATE ON public.depositos
    FOR EACH ROW
    EXECUTE FUNCTION update_fecha_solo_date();

-- Crear índice para mejorar performance de consultas por fecha
CREATE INDEX IF NOT EXISTS idx_depositos_fecha_solo_date 
ON public.depositos(fecha_solo_date);

-- Comentario sobre el uso
COMMENT ON COLUMN public.depositos.fecha_solo_date IS 'Fecha extraída de fecha_registro en formato DATE para filtros eficientes. Se actualiza automáticamente via trigger.';