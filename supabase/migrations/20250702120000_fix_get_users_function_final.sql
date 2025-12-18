-- Drop the old function to be safe
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Recreate the function with explicit column references
CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE(
  id uuid,
  nombre text,
  email text,
  user_rol text,
  estado text,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a search path to prevent ambiguity and address the security warning
SET search_path = public
AS $$
DECLARE
  calling_user_role text;
BEGIN
  -- Get the role of the user calling the function
  SELECT get_user_role(auth.uid()) INTO calling_user_role;

  -- Only allow admins to proceed
  IF calling_user_role <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  -- Return the user details, using aliases to be explicit
  RETURN QUERY
  SELECT
    u.id,
    p.nombre,
    u.email,
    p.rol,
    p.estado,
    u.last_sign_in_at
  FROM
    auth.users AS u
  JOIN
    public.profiles AS p ON u.id = p.id;
END;
$$;
