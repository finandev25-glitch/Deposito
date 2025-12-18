-- Drop the function to recreate it, as its return signature is changing.
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Recreate the function, renaming the output column 'rol' to 'user_rol' to resolve ambiguity.
CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE(
  id uuid,
  nombre text,
  usuario text,
  email text,
  user_rol text, -- Renamed from 'rol' to avoid ambiguity
  estado text,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: Only administrators can execute this function.
  IF (SELECT get_user_role(auth.uid())) &lt;&gt; 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren privilegios de administrador.';
  END IF;

  -- Return the user list.
  RETURN QUERY
    SELECT
      u.id,
      p.nombre,
      p.usuario,
      p.email,
      p.rol, -- The source column is still p.rol
      p.estado,
      u.last_sign_in_at
    FROM auth.users AS u
    JOIN public.profiles AS p ON u.id = p.id;
END;
$$;
