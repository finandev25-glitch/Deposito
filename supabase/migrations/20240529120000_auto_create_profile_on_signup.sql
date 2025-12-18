/*
          # [AUTOMATIC PROFILE CREATION]
          This migration automates the creation of user profiles and enhances security policies.

          ## Query Description: 
          1.  Creates a database function (`handle_new_user`) and a trigger (`on_auth_user_created`) to automatically insert a new record into the `public.profiles` table whenever a new user signs up in `auth.users`. This fixes the registration error caused by RLS policies.
          2.  Updates Row Level Security (RLS) policies on the `profiles` table to allow administrators to view and update all user profiles, which is necessary for the "Gestión de Usuarios" view to function correctly.
          
          This change is safe and significantly improves the robustness and security of the user management system.

          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Adds: 1 function (`public.handle_new_user`), 1 trigger (`on_auth_user_created`).
          - Modifies: RLS Policies for `public.profiles` table.
          
          ## Security Implications:
          - RLS Status: Enabled
          - Policy Changes: Yes. Replaces a permissive SELECT policy with a more secure one and adds an UPDATE policy for admins.
          - Auth Requirements: Supabase Auth
          
          ## Performance Impact:
          - Indexes: None
          - Triggers: Adds one trigger on `auth.users` table. The performance impact is negligible as it's a simple insert operation.
          - Estimated Impact: Low.
          */

-- 1. Create a function to automatically create a profile for a new user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, usuario, rol, estado)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    'finanzas', -- Default role for new users
    'inactivo'  -- Default status, requires admin approval
  );
  return new;
end;
$$;

-- 2. Create a trigger to execute the function after a new user signs up.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Update RLS policies for better security and admin functionality.

-- Drop the old permissive SELECT policy
drop policy if exists "Los perfiles públicos son visibles para todos." on public.profiles;

-- New SELECT policy: Users can see their own profile, and admins can see all profiles.
create policy "Enable select for users based on role"
  on public.profiles for select
  using ( auth.uid() = id OR (select rol from public.profiles where id = auth.uid()) = 'admin' );

-- New UPDATE policy: Admins can update any profile. This is combined with the existing policy.
create policy "Enable update for admins"
  on public.profiles for update
  using ( (select rol from public.profiles where id = auth.uid()) = 'admin' );
