-- Previous attempts to modify the get_all_users_with_details function failed
-- because PostgreSQL does not allow changing the return type of a function
-- with CREATE OR REPLACE. The correct procedure is to drop the function
-- and then create it again. This script implements that fix.

-- Step 1: Drop the existing function to avoid conflicts, as recommended by the database error.
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Step 2: Recreate the function with the correct return structure and security checks.
-- This function is designed to be called only by administrators to get a full list of users.
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
AS $$
BEGIN
  -- Security Check: Ensure the user calling this function has the 'admin' role.
  IF (SELECT get_user_role(auth.uid())) &lt;&gt; 'admin' THEN
    -- If the user is not an admin, raise an exception to deny access.
    RAISE EXCEPTION 'Acceso denegado: Se requiere rol de administrador.';
  END IF;

  -- If the check passes, return the user details by joining the auth.users and public.profiles tables.
  RETURN QUERY
  SELECT
    u.id,
    p.nombre,
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
