-- Drop the old, problematic function to ensure a clean slate.
DROP FUNCTION IF EXISTS get_all_users_with_details();

-- Recreate the function with the correct PL/pgSQL syntax and security context.
CREATE OR REPLACE FUNCTION get_all_users_with_details()
RETURNS TABLE(
  id uuid,
  nombre text,
  email text,
  user_rol text,
  estado text,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
-- SECURITY DEFINER is crucial for allowing this function to read from auth.users
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user calling this function has the 'admin' role.
  -- This is a security check to ensure only admins can get the list of all users.
  IF (SELECT get_user_role(auth.uid())) <> 'admin' THEN
    -- If the user is not an admin, exit the function immediately, returning an empty table.
    RETURN;
  END IF;

  -- If the user is an admin, proceed to execute the query and return the results.
  RETURN QUERY
    SELECT
      u.id,
      p.nombre,
      p.email,
      p.rol AS user_rol,
      p.estado,
      u.last_sign_in_at
    FROM
      auth.users AS u
    JOIN
      public.profiles AS p ON u.id = p.id
    ORDER BY
      p.nombre;
END;
$$;
