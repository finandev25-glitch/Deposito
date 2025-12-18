-- Elimina la función existente para evitar conflictos de tipo de dato.
DROP FUNCTION IF EXISTS public.count_personal_by_sucursal();

-- Vuelve a crear la función con el tipo de dato correcto para 'sucursal_id' (UUID).
-- Esto soluciona el error de tipo de dato que ocurría al llamar la función.
CREATE OR REPLACE FUNCTION public.count_personal_by_sucursal()
RETURNS TABLE(sucursal_id uuid, total_count bigint, active_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS sucursal_id,
    COUNT(sp.id) AS total_count,
    COUNT(sp.id) FILTER (WHERE sp.estado = 'activo') AS active_count
  FROM public.sucursales s
  LEFT JOIN public.sucursal_personal sp ON s.id = sp.sucursal_id
  GROUP BY s.id;
END;
$$ LANGUAGE plpgsql;
