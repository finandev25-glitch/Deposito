/*
# [FIX] Corregir Tipo de Retorno en Función de Conteo

Corrige un error de tipo de dato en la función `count_personal_by_sucursal`. La función devolvía un `uuid` para el ID de la sucursal, pero esperaba un `bigint`, causando un error.

## Query Description:
Esta operación elimina y vuelve a crear la función `count_personal_by_sucursal` con la definición de tipo de retorno correcta (`uuid` en lugar de `bigint`). Es una operación segura que no afecta los datos existentes y solo corrige la lógica interna de la base de datos.

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Modifica la función `count_personal_by_sucursal`.

## Security Implications:
- RLS Status: No aplica
- Policy Changes: No
- Auth Requirements: No

## Performance Impact:
- Indexes: No aplica
- Triggers: No aplica
- Estimated Impact: Nulo. Mejora la funcionalidad existente.
*/

-- Elimina la función existente para evitar conflictos de tipo.
DROP FUNCTION IF EXISTS count_personal_by_sucursal();

-- Vuelve a crear la función con el tipo de retorno correcto (uuid).
CREATE OR REPLACE FUNCTION count_personal_by_sucursal()
RETURNS TABLE(sucursal_id uuid, total_count bigint, active_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS sucursal_id,
    COUNT(sp.id) AS total_count,
    COUNT(sp.id) FILTER (WHERE sp.estado = 'activo') AS active_count
  FROM sucursales s
  LEFT JOIN sucursal_personal sp ON s.id = sp.sucursal_id
  GROUP BY s.id;
END;
$$ LANGUAGE plpgsql;
