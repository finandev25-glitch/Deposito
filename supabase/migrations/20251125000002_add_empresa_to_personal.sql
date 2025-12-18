-- Agregar campo empresa_id a sucursal_personal
ALTER TABLE public.sucursal_personal
ADD COLUMN IF NOT EXISTS empresa_id uuid NULL;

-- Agregar foreign key constraint
ALTER TABLE public.sucursal_personal
ADD CONSTRAINT sucursal_personal_empresa_id_fkey 
FOREIGN KEY (empresa_id) 
REFERENCES public.empresas(id) 
ON DELETE SET NULL;

-- Crear índice para mejorar búsquedas por empresa
CREATE INDEX IF NOT EXISTS idx_sucursal_personal_empresa_id 
ON public.sucursal_personal USING btree (empresa_id);

-- Comentario para documentar el campo
COMMENT ON COLUMN public.sucursal_personal.empresa_id IS 'Empresa asociada al trabajador (opcional)';
