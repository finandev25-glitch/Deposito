/*
# [Fix] Corrige la función de conteo de personal

Corrige la función `count_personal_by_sucursal` para que se alinee con la nueva estructura de la tabla `sucursal_personal`, que ahora almacena nombres en lugar de IDs de usuario.

## Query Description:
Esta operación reemplaza una función de base de datos existente. Es una operación segura que no afecta los datos de las tablas. Su propósito es corregir un error que impedía que la vista de "Sucursales" contara correctamente el número de personal, lo que causaba un error en la aplicación.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Modifica la función: `public.count_personal_by_sucursal()`

## Security Implications:
- RLS Status: No aplica
- Policy Changes: No
- Auth Requirements: No

## Performance Impact:
- Indexes: No aplica
- Triggers: No aplica
- Estimated Impact: Positivo. La función corregida es más simple y eficiente, ya que elimina una unión (join) innecesaria.
*/
create or replace function public.count_personal_by_sucursal()
returns table(sucursal_id bigint, total_count bigint, active_count bigint)
language plpgsql
as $$
begin
  return query
  select
    sp.sucursal_id,
    count(sp.id) as total_count,
    count(sp.id) filter (where sp.estado = 'activo') as active_count
  from
    public.sucursal_personal as sp
  group by
    sp.sucursal_id;
end;
$$;
