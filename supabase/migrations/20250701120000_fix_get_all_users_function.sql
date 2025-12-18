-- Elimina la función existente para evitar conflictos de tipo de retorno o sintaxis.
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Vuelve a crear la función con la sintaxis PL/pgSQL correcta y medidas de seguridad.
CREATE OR REPLACE FUNCTION public.get_all_users_with_details()
RETURNS TABLE(
  id uuid,
  nombre text,
  usuario text,
  email text,
  user_rol text, -- Renombrado para evitar ambigüedad con la columna 'rol'
  estado text,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
-- Establece una ruta de búsqueda segura para mitigar advertencias de seguridad.
SET search_path = public
AS $$
BEGIN
  -- Comprobación de seguridad: Solo los administradores pueden ejecutar esta función.
  -- La sintaxis IF/THEN/END IF; es la correcta para PL/pgSQL.
  IF get_user_role(auth.uid()) &lt;&gt; 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Solo los administradores pueden ver todos los usuarios.';
  END IF;

  -- Si la comprobación de seguridad pasa, devuelve la consulta con los datos de los usuarios.
  RETURN QUERY
  SELECT
    u.id,
    p.nombre,
    p.usuario,
    p.email,
    p.rol AS user_rol, -- Se utiliza el alias para que coincida con la definición de la tabla de retorno.
    p.estado,
    u.last_sign_in_at
  FROM
    auth.users u
  JOIN
    public.profiles p ON u.id = p.id;
END;
$$;
