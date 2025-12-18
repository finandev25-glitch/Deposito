-- Eliminar la función existente si existe
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Volver a crear la función con la sintaxis correcta
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
AS $$
BEGIN
  -- Verificar si el usuario que llama es un administrador
  IF (SELECT get_user_role(auth.uid())) &lt;&gt; 'admin' THEN
    -- Si no es admin, lanzar una excepción
    RAISE EXCEPTION 'Acceso denegado: Solo los administradores pueden ver la lista de usuarios.';
  END IF;

  -- Si es admin, devolver la lista de usuarios
  RETURN QUERY
    SELECT
      u.id,
      p.nombre,
      p.usuario,
      p.email,
      p.rol,
      p.estado,
      u.last_sign_in_at
    FROM
      auth.users u
    LEFT JOIN
      public.profiles p ON u.id = p.id;
END;
$$;
