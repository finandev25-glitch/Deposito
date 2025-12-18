-- Reemplaza la función existente con la versión corregida para solucionar el error de sintaxis.
CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE(
  id uuid,
  nombre text,
  email text,
  rol text,
  estado text,
  last_sign_in_at timestamptz
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Primero, verifica si el usuario actual tiene el rol de 'admin'.
  -- Si no es admin, la función termina y no devuelve filas.
  IF get_user_role(auth.uid()) &lt;&gt; 'admin' THEN
    RETURN;
  END IF;

  -- Si la verificación pasa (el usuario es admin), devuelve la información de todos los usuarios.
  RETURN QUERY
  SELECT
    u.id,
    p.nombre,
    u.email,
    p.rol,
    p.estado,
    u.last_sign_in_at
  FROM
    auth.users u
  LEFT JOIN
    public.profiles p ON u.id = p.id
  ORDER BY
    p.nombre;
END;
$$ LANGUAGE plpgsql;
