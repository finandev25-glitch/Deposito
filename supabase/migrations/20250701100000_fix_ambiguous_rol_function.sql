/*
# [Fix] Corrige la ambigüedad en la función get_all_users_with_details

## Query Description: [Este script corrige un error en la función de base de datos que obtiene los detalles de los usuarios. El error "column reference 'rol' is ambiguous" ocurría porque la función no podía distinguir entre la columna 'rol' que devolvía y la columna 'rol' de la tabla de perfiles. Se ha renombrado la columna de salida a 'user_rol' para eliminar la ambigüedad.]

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: false

## Structure Details:
- Modifies the function `get_all_users_with_details()`

## Security Implications:
- RLS Status: [N/A]
- Policy Changes: [No]
- Auth Requirements: [admin]

## Performance Impact:
- Indexes: [N/A]
- Triggers: [N/A]
- Estimated Impact: [None]
*/

-- Elimina la función existente si existe para evitar conflictos
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Vuelve a crear la función con la sintaxis corregida y la columna renombrada
CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE(
  id uuid,
  nombre text,
  user_rol text, -- Columna renombrada para evitar ambigüedad
  last_sign_in_at timestamptz,
  estado text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_role text;
BEGIN
  -- Obtener el rol del usuario que llama a la función
  SELECT get_user_role(auth.uid()) INTO calling_user_role;

  -- Comprobar si el usuario es administrador
  IF calling_user_role &lt;&gt; 'admin' THEN
    RAISE EXCEPTION 'No tienes permisos para realizar esta acción.';
  END IF;

  -- Devolver los datos si es administrador
  RETURN QUERY
  SELECT
    p.id,
    p.nombre,
    p.rol AS user_rol, -- Alias para la columna de salida
    u.last_sign_in_at,
    p.estado,
    p.email
  FROM
    auth.users u
  JOIN
    public.profiles p ON u.id = p.id;
END;
$$;
