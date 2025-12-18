/*
# [Fix] Actualizar Función de Conteo de Personal
Corrige la función `count_personal_by_sucursal` para que sea compatible con la nueva estructura de la tabla `sucursal_personal`, que ya no contiene una referencia a `usuario_id`.

## Query Description:
Esta operación actualiza una función existente en la base de datos. No afecta a los datos directamente, pero corrige un error que impedía que la aplicación cargara correctamente las estadísticas de personal por sucursal. Es una operación segura y reversible.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Function affected: `public.count_personal_by_sucursal`

## Security Implications:
- RLS Status: No changes to RLS.
- Policy Changes: No.
- Auth Requirements: None.

## Performance Impact:
- Indexes: None.
- Triggers: None.
- Estimated Impact: Bajo. Mejora el rendimiento al corregir una función rota.
*/
create or replace function public.count_personal_by_sucursal()
returns table(sucursal_id bigint, total_count bigint, active_count bigint) as $$
begin
  return query
    select
      s.id as sucursal_id,
      count(sp.id) as total_count,
      count(sp.id) filter (where sp.estado = 'activo') as active_count
    from public.sucursales s
    left join public.sucursal_personal sp on s.id = sp.sucursal_id
    group by s.id;
end;
$$ language plpgsql stable security definer;
