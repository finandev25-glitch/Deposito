-- Elimina la función existente para permitir su recreación con una nueva estructura.
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Vuelve a crear la función con la sintaxis y estructura de retorno correctas.
CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE (
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
-- Establece el search_path para evitar problemas de ambigüedad de esquemas.
SET search_path = public, auth
AS $$
BEGIN
  -- Comprueba si el usuario que llama a la función es un administrador.
  IF (SELECT get_user_role(auth.uid())) = 'admin' THEN
    -- Si es administrador, devuelve la lista completa de usuarios y sus detalles.
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
  END IF;
  -- Si el usuario no es administrador, la función no devuelve ninguna fila.
END;
$$;
