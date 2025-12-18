CREATE OR REPLACE FUNCTION get_all_users_with_details()
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
AS $$
BEGIN
  -- Check if the current user is an admin
  IF get_user_role(auth.uid()) &lt;&gt; 'admin' THEN
    RAISE EXCEPTION 'Solo los administradores pueden acceder a esta información.';
  END IF;

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
    public.profiles p ON u.id = p.id;
END;
$$;
