-- Corrige la función count_personal_by_sucursal para evitar conflictos de search_path y tipos de datos.
-- 1. Elimina la función existente.
-- 2. Vuelve a crear la función con un search_path explícito y el tipo de retorno correcto (bigint).

DROP FUNCTION IF EXISTS public.count_personal_by_sucursal();

CREATE OR REPLACE FUNCTION public.count_personal_by_sucursal()
RETURNS TABLE(sucursal_id bigint, total_count bigint, active_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS sucursal_id,
    COUNT(sp.id) AS total_count,
    COUNT(sp.id) FILTER (WHERE sp.estado = 'activo') AS active_count
  FROM
    sucursales s
  LEFT JOIN
    sucursal_personal sp ON s.id = sp.sucursal_id
  GROUP BY
    s.id;
END;
$$;
