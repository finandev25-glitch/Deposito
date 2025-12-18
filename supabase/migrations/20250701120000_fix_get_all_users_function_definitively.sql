-- Elimina la función existente para evitar conflictos de tipo o sintaxis.
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Vuelve a crear la función con la sintaxis plpgsql correcta y mejores prácticas de seguridad.
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
-- Establece explícitamente el search_path para mayor seguridad y para evitar errores de ambigüedad.
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Obtiene el rol del usuario que está llamando a la función.
  SELECT get_user_role(auth.uid()) INTO caller_role;

  -- Comprueba si el usuario no es un administrador.
  IF caller_role &lt;&gt; 'admin' THEN
    -- Si no es admin, detiene la ejecución y devuelve una tabla vacía.
    RETURN;
  END IF;

  -- Si es admin, procede a devolver la lista de usuarios.
  RETURN QUERY
  SELECT
    p.id,
    p.nombre,
    p.email,
    p.rol AS user_rol, -- Se usa un alias para evitar la ambigüedad con la columna de salida.
    p.estado,
    u.last_sign_in_at
  FROM
    auth.users u
  JOIN
    public.profiles p ON u.id = p.id;
END;
$$;
