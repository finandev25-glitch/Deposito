-- Agregar columna empresa como texto libre
ALTER TABLE public.sucursal_personal
ADD COLUMN IF NOT EXISTS empresa text NULL;


COMMENT ON COLUMN public.sucursal_personal.empresa IS 'Nombre de la empresa (texto libre opcional)';
