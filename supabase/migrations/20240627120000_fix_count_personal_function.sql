/*
# [Fix] Corrige la función count_personal_by_sucursal
Este script soluciona un error de migración al recrear la función que cuenta el personal por sucursal.

## Query Description:
La operación elimina la función `count_personal_by_sucursal` existente, que tenía una estructura de retorno incorrecta, y la vuelve a crear con la definición correcta. Esto es necesario porque PostgreSQL no permite modificar la estructura de retorno de una función con `CREATE OR REPLACE`. La función corregida se alinea con la estructura actual de la tabla `sucursal_personal`.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: false

## Structure Details:
- Modifies function: `public.count_personal_by_sucursal`

## Security Implications:
- RLS Status: Not applicable
- Policy Changes: No
- Auth Requirements: Admin privileges to modify functions.

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Negligible. Improves function correctness.
*/

-- Elimina la función existente para permitir el cambio en su estructura de retorno.
DROP FUNCTION IF EXISTS public.count_personal_by_sucursal();

-- Vuelve a crear la función con la definición correcta.
CREATE OR REPLACE FUNCTION public.count_personal_by_sucursal()
RETURNS TABLE(sucursal_id bigint, total_count bigint, active_count bigint)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS sucursal_id,
    COUNT(sp.id) AS total_count,
    COUNT(sp.id) FILTER (WHERE sp.estado = 'activo') AS active_count
  FROM
    public.sucursales s
  LEFT JOIN
    public.sucursal_personal sp ON s.id = sp.sucursal_id
  GROUP BY
    s.id;
END;
$$;
