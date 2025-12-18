-- Elimina la función existente para evitar conflictos de tipo o sintaxis.
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Vuelve a crear la función con la sintaxis correcta de PL/pgSQL.
CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE(
  id uuid,
  nombre text,
  email text,
  user_rol text,
  estado text,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_role text;
BEGIN
  -- Obtiene el rol del usuario que llama a la función.
  SELECT get_user_role(auth.uid()) INTO calling_user_role;

  -- Comprueba si el usuario es administrador.
  -- Esta es la sintaxis correcta para una condición en PL/pgSQL.
  IF calling_user_role <> 'admin' THEN
    -- Si no es admin, la función termina y devuelve una tabla vacía.
    RETURN;
  END IF;

  -- Si es admin, devuelve la consulta con los datos de todos los usuarios.
  RETURN QUERY
    SELECT
      u.id,
      p.nombre,
      u.email,
      p.rol AS user_rol, -- Se usa un alias para evitar ambigüedad.
      p.estado,
      u.last_sign_in_at
    FROM
      auth.users u
    JOIN
      public.profiles p ON u.id = p.id;
END;
$$;
