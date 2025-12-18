-- Elimina la función existente para permitir su recreación con una nueva firma de retorno.
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Vuelve a crear la función con la sintaxis correcta y la comprobación de permisos.
CREATE FUNCTION public.get_all_users_with_details()
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
  -- Comprobación de seguridad: solo los administradores pueden ejecutar esta función.
  IF (SELECT get_user_role(auth.uid())) &lt;&gt; 'admin' THEN
    RAISE EXCEPTION 'No tienes permiso para realizar esta acción.';
  END IF;

  -- Devuelve los detalles del usuario uniendo perfiles con auth.users.
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
  JOIN
    auth.users u ON p.id = u.id;
END;
$$;
