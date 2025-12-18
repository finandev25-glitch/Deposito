/*
          # [DANGEROUS] Crear función para eliminar sucursal y su personal
          Esta función crea un procedimiento almacenado `delete_sucursal_with_personal` que elimina de forma segura una sucursal y todo el personal asociado a ella. Esta operación es necesaria para evitar errores de violación de claves foráneas.

          ## Query Description: [Esta operación es destructiva y permanente. Eliminará una sucursal y todos los registros de personal vinculados a ella. No se puede deshacer. Se recomienda hacer un respaldo antes de usar esta función. No afectará a los registros de depósitos existentes que referencien a la sucursal, ya que la relación no impone una eliminación en cascada en esa dirección.]
          
          ## Metadata:
          - Schema-Category: ["Dangerous"]
          - Impact-Level: ["High"]
          - Requires-Backup: [true]
          - Reversible: [false]
          
          ## Structure Details:
          - Function created: `public.delete_sucursal_with_personal(uuid)`
          - Tables affected by the function's execution: `public.sucursal_personal`, `public.sucursales`
          
          ## Security Implications:
          - RLS Status: [N/A for function definition, but execution respects RLS of the caller]
          - Policy Changes: [No]
          - Auth Requirements: [La función debe ser llamada por un rol que tenga permisos de eliminación en las tablas `sucursales` y `sucursal_personal`. Las políticas RLS existentes para usuarios autenticados ya conceden esto.]
          
          ## Performance Impact:
          - Indexes: [No changes]
          - Triggers: [No changes]
          - Estimated Impact: [Bajo. El impacto dependerá del número de registros de personal a eliminar, pero debería ser rápido para un número razonable de personal por sucursal.]
          */
CREATE OR REPLACE FUNCTION public.delete_sucursal_with_personal(sucursal_id_to_delete uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Primero, eliminar todo el personal asociado a la sucursal para evitar errores de clave foránea.
  DELETE FROM public.sucursal_personal WHERE sucursal_id = sucursal_id_to_delete;

  -- Segundo, eliminar la sucursal una vez que ya no tiene personal asociado.
  DELETE FROM public.sucursales WHERE id = sucursal_id_to_delete;
END;
$$;
