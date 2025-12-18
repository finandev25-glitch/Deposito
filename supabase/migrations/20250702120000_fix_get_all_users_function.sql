-- Drop the existing function to allow for recreation with a new return type
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Recreate the function with the correct return type and logic
CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE (
  id uuid,
  nombre text,
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
  -- Security check: Only admins can run this function
  IF (SELECT get_user_role(auth.uid())) &lt;&gt; 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Se requiere rol de administrador.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.nombre,
    p.email,
    p.rol,
    p.estado,
    u.last_sign_in_at
  FROM
    public.profiles AS p
  LEFT JOIN
    auth.users AS u ON p.id = u.id;
END;
$$;
