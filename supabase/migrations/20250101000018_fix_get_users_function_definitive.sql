-- Primero, elimina la función existente para evitar conflictos de firma.
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Luego, crea la función con la estructura y sintaxis correctas.
CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE(
  id uuid,
  nombre text,
  usuario text,
  email text,
  rol text,
  estado text,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Comprobación de seguridad: solo los administradores pueden ejecutar esta función.
  IF (SELECT get_user_role(auth.uid())) &lt;&gt; 'admin' THEN
    RAISE EXCEPTION 'No tienes permisos para realizar esta acción';
  END IF;

  -- Devuelve la consulta con los datos de los usuarios.
  RETURN QUERY
    SELECT
      p.id,
      p.nombre,
      p.usuario,
      p.email,
      p.rol,
      p.estado,
      u.last_sign_in_at
    FROM
      public.profiles p
    LEFT JOIN
      auth.users u ON p.id = u.id;
END;
$$;
