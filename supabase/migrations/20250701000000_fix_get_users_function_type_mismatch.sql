-- Drop the existing function to avoid conflicts
DROP FUNCTION IF EXISTS public.get_all_users_with_details();

-- Recreate the function with the correct type casting for the email column
-- and a safe search_path to address security warnings.
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
-- Setting a safe search path is a good security practice.
SET search_path = public
AS $$
DECLARE
    calling_user_role text;
BEGIN
    -- Get the role of the calling user from our helper function
    SELECT get_user_role(auth.uid()) INTO calling_user_role;

    -- This function should only return data if the caller is an admin
    IF calling_user_role = 'admin' THEN
        RETURN QUERY
        SELECT
            u.id,
            p.nombre,
            u.email::text, -- Explicitly cast email to text to match the function's return type
            p.rol,
            p.estado,
            u.last_sign_in_at
        FROM
            auth.users u
        LEFT JOIN
            public.profiles p ON u.id = p.id;
    ELSE
        -- If the user is not an admin, return an empty result set.
        -- This is more secure than raising an error.
        RETURN;
    END IF;
END;
$$;
