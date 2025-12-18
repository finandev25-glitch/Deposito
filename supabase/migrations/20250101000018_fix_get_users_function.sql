-- Primero, eliminamos la función existente para evitar conflictos.
DROP FUNCTION IF EXISTS get_all_users_with_details();

-- Luego, la volvemos a crear con la estructura y sintaxis correctas.
CREATE OR REPLACE FUNCTION get_all_users_with_details()
RETURNS TABLE(
  id uuid,
  nombre text,
  usuario text,
  email text,
  rol text,
  estado text,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Comprueba si el usuario que llama a la función es un administrador.
  IF get_user_role(auth.uid()) <> 'admin' THEN
    -- Si no es admin, devuelve un conjunto vacío para proteger los datos.
    RETURN;
  ELSE
    -- Si es admin, devuelve la lista completa de usuarios con sus detalles.
    RETURN QUERY
    SELECT
      p.id,
      p.nombre,
      p.usuario,
      p.email,
      p.rol,
      p.estado,
      u.last_sign_in_at
    FROM
      public.profiles p
    LEFT JOIN
      auth.users u ON p.id = u.id
    ORDER BY
      p.nombre;
  END IF;
END;
$$;
