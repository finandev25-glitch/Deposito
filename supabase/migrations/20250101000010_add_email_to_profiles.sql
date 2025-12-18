-- 1. Add email column to profiles table
ALTER TABLE public.profiles
ADD COLUMN email TEXT;

-- 2. Update the trigger function to populate the email on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email, rol, estado)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email, 'finanzas', 'inactivo');
  RETURN new;
END;
$$;

-- 3. Backfill the email for existing users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;
