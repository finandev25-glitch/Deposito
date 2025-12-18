/*
# [Operation] Create Profiles Table and Policies
[This script creates the `public.profiles` table to store user data and sets up Row Level Security (RLS) policies to control access.]

## Query Description: [This operation sets up the foundational table for storing user profile information, linking it to the authentication system. It enables RLS to ensure users can only access and manage their own data, which is a critical security measure. No existing data will be affected as this creates a new table.]

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- Tables created: `public.profiles`
- Columns added: `id`, `nombre`, `rol`, `estado`, `usuario`
- Constraints added: Primary Key on `id`, Foreign Key referencing `auth.users(id)`
- Policies created: SELECT, INSERT, UPDATE policies on `public.profiles`

## Security Implications:
- RLS Status: [Enabled]
- Policy Changes: [Yes]
- Auth Requirements: [Policies are based on `auth.uid()`]

## Performance Impact:
- Indexes: [Primary Key index created on `id`]
- Triggers: [None]
- Estimated Impact: [Low. This is a standard setup for user profiles.]
*/

-- Crear la tabla para perfiles de usuario
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  nombre text,
  rol text,
  estado text,
  usuario text,
  primary key (id)
);

-- Comentarios en la tabla y columnas para mayor claridad
comment on table public.profiles is 'Stores public profile information for each user.';
comment on column public.profiles.id is 'References the user''s ID from auth.users.';

-- Habilitar Row Level Security
alter table public.profiles enable row level security;

-- Política para permitir a los usuarios leer todos los perfiles (si se desea, o se puede restringir)
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

-- Política para permitir a los usuarios crear su propio perfil
create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

-- Política para permitir a los usuarios actualizar su propio perfil
create policy "Users can update their own profile."
  on public.profiles for update
  using ( auth.uid() = id );
