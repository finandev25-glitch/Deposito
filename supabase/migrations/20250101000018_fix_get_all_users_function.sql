-- Primero, eliminamos la función existente para evitar conflictos.
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Creamos la función de nuevo con la sintaxis correcta y una lógica de seguridad mejorada.
CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE (
    id uuid,
    email text,
    nombre text,
    user_rol text,
    estado text,
    last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Comprueba si el usuario actual es un administrador.
  -- Esta es la sintaxis correcta para un bloque IF en plpgsql.
  IF (SELECT get_user_role(auth.uid())) <> 'admin' THEN
    -- Si no es admin, lanza una excepción para denegar el acceso.
    RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios de administrador.';
  END IF;

  -- Si la comprobación es exitosa, devuelve la lista de usuarios.
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    p.nombre,
    p.rol AS user_rol, -- Usamos el alias para evitar ambigüedad
    p.estado,
    u.last_sign_in_at
  FROM
    auth.users u
  JOIN
    public.profiles p ON u.id = p.id;
END;
$$;
