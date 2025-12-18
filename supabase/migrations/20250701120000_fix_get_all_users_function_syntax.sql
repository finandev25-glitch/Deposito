-- Elimina la función existente para evitar conflictos de tipo de retorno.
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Vuelve a crear la función con la sintaxis plpgsql correcta.
CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
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
-- Establece el search_path para evitar problemas de seguridad y ambigüedad.
SET search_path = public
AS $$
BEGIN
  -- Comprueba si el rol del usuario actual NO es 'admin'.
  IF get_user_role(auth.uid()) &lt;&gt; 'admin' THEN
    -- Si no es admin, lanza una excepción para denegar el acceso.
    RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios de administrador.';
  END IF;

  -- Si la comprobación pasa, devuelve la consulta con los datos de los usuarios.
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
      auth.users u
    JOIN
      public.profiles p ON u.id = p.id;
END;
$$;
