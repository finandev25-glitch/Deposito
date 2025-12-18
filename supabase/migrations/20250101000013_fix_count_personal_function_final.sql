-- Elimina la función incorrecta si existe
DROP FUNCTION IF EXISTS public.count_personal_by_sucursal();

-- Vuelve a crear la función con el tipo de dato correcto para sucursal_id (bigint)
CREATE OR REPLACE FUNCTION public.count_personal_by_sucursal()
RETURNS TABLE(sucursal_id bigint, total_count bigint, active_count bigint)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as sucursal_id,
    count(sp.id) as total_count,
    count(sp.id) filter (where sp.estado = 'activo') as active_count
  FROM public.sucursales s
  LEFT JOIN public.sucursal_personal sp ON s.id = sp.sucursal_id
  GROUP BY s.id;
END;
$$;
