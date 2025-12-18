-- Elimina la función existente para evitar conflictos de tipo.
DROP FUNCTION IF EXISTS public.count_personal_by_sucursal();

-- Vuelve a crear la función con la estructura de retorno correcta.
-- La columna sucursal_id debe ser UUID para coincidir con el tipo de dato real en la tabla.
CREATE OR REPLACE FUNCTION public.count_personal_by_sucursal()
RETURNS TABLE(sucursal_id uuid, total_count bigint, active_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    sp.sucursal_id,
    count(*) AS total_count,
    count(*) FILTER (WHERE sp.estado = 'activo') AS active_count
  FROM
    public.sucursal_personal AS sp
  GROUP BY
    sp.sucursal_id;
$$;
