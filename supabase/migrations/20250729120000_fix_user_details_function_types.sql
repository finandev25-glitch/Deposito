-- Elimina la función existente para evitar conflictos de tipo.
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Vuelve a crear la función con los tipos de datos de retorno correctos.
CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE(
  id uuid,
  nombre text,
  email text, -- Definido como text
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
  -- Obtiene el rol del usuario que llama a la función
  SELECT get_user_role(auth.uid()) INTO calling_user_role;

  -- Solo los administradores pueden obtener la lista completa de usuarios
  IF calling_user_role = 'admin' THEN
    RETURN QUERY
    SELECT
      u.id,
      p.nombre,
      u.email::text, -- Se convierte explícitamente a 'text' para que coincida
      p.rol as user_rol,
      p.estado,
      u.last_sign_in_at
    FROM
      auth.users u
    JOIN
      public.profiles p ON u.id = p.id
    ORDER BY
      p.nombre;
  END IF;
END;
$$;
