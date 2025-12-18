/*
# [Fix] Función para obtener el rol del usuario actual
Crea una función auxiliar para obtener el rol del usuario autenticado de forma segura.

## Query Description:
Esta función se utiliza en las políticas de seguridad (RLS) para evitar bucles de recursión infinita. Al ser `SECURITY DEFINER`, se ejecuta con los permisos del creador, permitiendo una consulta segura a la tabla `profiles` sin volver a activar las políticas de la misma tabla.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (se puede eliminar la función)

## Security Implications:
- RLS Status: Afecta la implementación de RLS.
- Policy Changes: No, es una función de apoyo.
- Auth Requirements: Requiere un usuario autenticado.
*/
create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select rol from public.profiles where id = auth.uid()
$$;


/*
# [Fix] Eliminar políticas de seguridad recursivas
Elimina las políticas de la tabla `profiles` que causaban un error de recursión infinita.

## Query Description:
Estas políticas contenían una subconsulta a la misma tabla `profiles`, lo que generaba un bucle sin fin al ser evaluadas. Su eliminación es necesaria para poder reemplazarlas con versiones corregidas.

## Metadata:
- Schema-Category: "Dangerous"
- Impact-Level: "High"
- Requires-Backup: true
- Reversible: false (las políticas se eliminan)

## Security Implications:
- RLS Status: Modifica RLS.
- Policy Changes: Yes
- Auth Requirements: N/A
*/
drop policy if exists "Los administradores pueden ver todos los perfiles." on public.profiles;
drop policy if exists "Los administradores pueden actualizar cualquier perfil." on public.profiles;


/*
# [Fix] Recrear políticas de seguridad para administradores
Vuelve a crear las políticas para administradores utilizando la función auxiliar `get_my_role()` para evitar la recursión.

## Query Description:
Estas nuevas políticas permiten a los usuarios con el rol 'admin' ver y actualizar todos los perfiles de usuario. El uso de la función `get_my_role()` resuelve el error de recursión infinita que impedía el acceso a los datos.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Medium"
- Requires-Backup: false
- Reversible: true (se puede eliminar las políticas)

## Security Implications:
- RLS Status: Modifica RLS.
- Policy Changes: Yes
- Auth Requirements: Rol de 'admin'.
*/
create policy "Los administradores pueden ver todos los perfiles."
  on public.profiles for select
  using ( public.get_my_role() = 'admin' );

create policy "Los administradores pueden actualizar cualquier perfil."
  on public.profiles for update
  using ( public.get_my_role() = 'admin' );
