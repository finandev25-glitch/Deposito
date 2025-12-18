-- MIGRATION: Añadir correo electrónico a la tabla de perfiles

-- Paso 1: Añadir la columna de correo electrónico a la tabla de perfiles.
-- Se añade de forma segura sin interrumpir el servicio.
ALTER TABLE public.profiles
ADD COLUMN email TEXT;

-- Paso 2: Rellenar el correo electrónico para los usuarios ya existentes.
-- Esta operación copia el correo desde la tabla de autenticación (auth.users)
-- a la nueva columna en la tabla de perfiles (public.profiles).
-- Se ejecuta una sola vez para sincronizar los datos históricos.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- Paso 3: Actualizar la función del disparador (trigger) para que los nuevos usuarios
-- también tengan su correo electrónico guardado en su perfil automáticamente.
-- Esto asegura que la sincronización se mantenga para futuros registros.
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, usuario, rol, estado, email)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'user_name',
    'finanzas',
    'inactivo',
    new.email
  );
  RETURN new;
END;
$$;
