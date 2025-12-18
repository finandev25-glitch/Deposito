-- Elimina la función existente para evitar conflictos de tipo de retorno.
DROP FUNCTION IF EXISTS get_all_users_with_details();

-- Vuelve a crear la función con la estructura y sintaxis correctas.
CREATE OR REPLACE FUNCTION get_all_users_with_details()
RETURNS TABLE(
  id uuid,
  nombre text,
  rol text,
  estado text,
  email text,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Comprobación de seguridad: solo los administradores pueden ejecutar esta función.
  IF get_user_role(auth.uid()) <> 'admin' THEN
    RAISE EXCEPTION 'Acción no permitida. Se requieren privilegios de administrador.';
  END IF;

  -- Devuelve la tabla con los datos de los perfiles y la información de autenticación.
  RETURN QUERY
    SELECT
      p.id,
      p.nombre,
      p.rol,
      p.estado,
      u.email, -- Obtiene el email de la tabla auth.users
      u.last_sign_in_at -- Obtiene la fecha del último acceso de auth.users
    FROM
      public.profiles AS p
    JOIN
      auth.users AS u ON p.id = u.id;
END;
$$;
