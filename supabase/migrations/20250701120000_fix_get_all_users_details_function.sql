-- 1. Eliminar la función anterior si existe para evitar conflictos.
DROP FUNCTION IF EXISTS get_all_users_with_details();

-- 2. Crear la nueva función corregida.
-- Esta función obtiene todos los detalles del usuario, incluyendo el último acceso.
-- Es SECURITY DEFINER para poder leer de auth.users, y tiene una comprobación
-- interna para asegurar que solo los administradores puedan llamarla.
CREATE OR REPLACE FUNCTION get_all_users_with_details()
RETURNS TABLE(
  id uuid,
  nombre text,
  usuario text,
  rol text,
  estado text,
  last_sign_in_at timestamptz,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
-- Establecer el search_path previene vulnerabilidades y asegura que se encuentren las tablas correctas.
SET search_path = public
AS $$
BEGIN
  -- Comprobación de seguridad: Solo los administradores pueden ejecutar esta función.
  -- Se consulta directamente el rol desde la tabla de perfiles para mayor robustez.
  IF (SELECT rol FROM public.profiles WHERE id = auth.uid()) <> 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: Solo los administradores pueden ver esta información.';
  END IF;

  -- Si la comprobación pasa, se devuelve la información de todos los usuarios.
  RETURN QUERY
  SELECT
    u.id,
    p.nombre,
    p.usuario,
    p.rol,
    p.estado,
    u.last_sign_in_at,
    p.email
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id;
END;
$$;
