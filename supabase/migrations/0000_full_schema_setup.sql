-- =================================================================
-- ==================      HELPER FUNCTIONS      ===================
-- =================================================================

-- Function to get a user's role from the profiles table
create or replace function public.get_user_role(user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return (select rol from public.profiles where id = user_id);
end;
$$;

-- Function to create a profile for a new user
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
    new.raw_user_meta_data->>'full_name',
    new.email, -- or extract from email
    'finanzas', -- default role
    'inactivo'  -- default status
  );
  return new;
end;
$$;

-- =================================================================
-- ==================         TABLES           ===================
-- =================================================================

-- Profiles Table (linked to auth.users)
create table if not exists public.profiles (
  id uuid not null primary key references auth.users on delete cascade,
  nombre text,
  usuario text unique,
  rol text default 'finanzas',
  estado text default 'inactivo',
  last_sign_in_at timestamptz
);
comment on table public.profiles is 'Stores public-facing profile information for each user.';

-- Bancos Table
create table if not exists public.bancos (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz with time zone not null default now(),
  nombre text not null,
  abreviatura text not null unique,
  estado text not null default 'activo'
);
comment on table public.bancos is 'Stores bank information.';

-- Empresas Table
create table if not exists public.empresas (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz with time zone not null default now(),
  nombre text not null unique
);
comment on table public.empresas is 'Stores company information.';

-- Cuentas Bancarias Table
create table if not exists public.cuentas_bancarias (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz with time zone not null default now(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  banco_id uuid not null references public.bancos(id) on delete cascade,
  anexo text,
  nro_cuenta text not null,
  subdiario text,
  estado text not null default 'activo'
);
comment on table public.cuentas_bancarias is 'Stores bank account details for each company.';

-- Sucursales Table
create table if not exists public.sucursales (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz with time zone not null default now(),
  nombre text not null,
  telefono text,
  estado text not null default 'activa'
);
comment on table public.sucursales is 'Stores branch office information.';

-- Sucursal Personal Junction Table
create table if not exists public.sucursal_personal (
  id uuid not null default gen_random_uuid() primary key,
  sucursal_id uuid not null references public.sucursales(id) on delete cascade,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  unique(sucursal_id, usuario_id)
);
comment on table public.sucursal_personal is 'Links users (personal) to branches (sucursales).';

-- Depositos Table
create table if not exists public.depositos (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz with time zone not null default now(),
  numero_operacion text not null,
  cliente text,
  monto numeric not null,
  moneda text not null,
  fecha_registro timestamptz with time zone not null default now(),
  imagen_voucher text,
  anexo text,
  numero_operacion_banco text,
  fecha_deposito date,
  estado text not null default 'pendiente',
  observaciones text,
  motivo_rechazo text,
  fecha_validacion timestamptz,
  empresa_id uuid references public.empresas(id),
  banco_id uuid references public.bancos(id),
  sucursal_id uuid references public.sucursales(id),
  vendedor_id uuid references public.profiles(id),
  validado_por uuid references public.profiles(id)
);
comment on table public.depositos is 'Stores all deposit records.';


-- =================================================================
-- ==================      TRIGGERS & RPC      ===================
-- =================================================================

-- Trigger to create a profile when a new user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC to count staff per branch
create or replace function public.count_personal_by_sucursal()
returns table (sucursal_id uuid, total_count bigint, active_count bigint)
language sql
as $$
  select
    s.id as sucursal_id,
    count(sp.usuario_id) as total_count,
    count(sp.usuario_id) filter (where p.estado = 'activo') as active_count
  from sucursales s
  left join sucursal_personal sp on s.id = sp.sucursal_id
  left join profiles p on sp.usuario_id = p.id
  group by s.id;
$$;


-- =================================================================
-- ================== ROW LEVEL SECURITY (RLS) ===================
-- =================================================================

-- Enable RLS for all tables
alter table public.profiles enable row level security;
alter table public.bancos enable row level security;
alter table public.empresas enable row level security;
alter table public.cuentas_bancarias enable row level security;
alter table public.sucursales enable row level security;
alter table public.sucursal_personal enable row level security;
alter table public.depositos enable row level security;

-- Policies for PROFILES
drop policy if exists "Los perfiles son visibles para todos." on public.profiles;
create policy "Los perfiles son visibles para todos." on public.profiles
  for select using (true);

drop policy if exists "Los usuarios pueden insertar su propio perfil." on public.profiles;
create policy "Los usuarios pueden insertar su propio perfil." on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Los usuarios pueden actualizar su propio perfil." on public.profiles;
create policy "Los usuarios pueden actualizar su propio perfil." on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Los administradores pueden gestionar todos los perfiles." on public.profiles;
create policy "Los administradores pueden gestionar todos los perfiles." on public.profiles
  for all using (get_user_role(auth.uid()) = 'admin');

-- Policies for BANCOS
drop policy if exists "Los usuarios autenticados pueden leer bancos." on public.bancos;
create policy "Los usuarios autenticados pueden leer bancos." on public.bancos
  for select using (auth.role() = 'authenticated');

drop policy if exists "Los administradores pueden gestionar bancos." on public.bancos;
create policy "Los administradores pueden gestionar bancos." on public.bancos
  for all using (get_user_role(auth.uid()) = 'admin');

-- Policies for EMPRESAS
drop policy if exists "Los usuarios autenticados pueden leer empresas." on public.empresas;
create policy "Los usuarios autenticados pueden leer empresas." on public.empresas
  for select using (auth.role() = 'authenticated');

drop policy if exists "Los administradores pueden gestionar empresas." on public.empresas;
create policy "Los administradores pueden gestionar empresas." on public.empresas
  for all using (get_user_role(auth.uid()) = 'admin');

-- Policies for CUENTAS_BANCARIAS
drop policy if exists "Los usuarios autenticados pueden leer cuentas." on public.cuentas_bancarias;
create policy "Los usuarios autenticados pueden leer cuentas." on public.cuentas_bancarias
  for select using (auth.role() = 'authenticated');

drop policy if exists "Los administradores pueden gestionar cuentas." on public.cuentas_bancarias;
create policy "Los administradores pueden gestionar cuentas." on public.cuentas_bancarias
  for all using (get_user_role(auth.uid()) = 'admin');

-- Policies for SUCURSALES
drop policy if exists "Los usuarios autenticados pueden leer sucursales." on public.sucursales;
create policy "Los usuarios autenticados pueden leer sucursales." on public.sucursales
  for select using (auth.role() = 'authenticated');

drop policy if exists "Los administradores pueden gestionar sucursales." on public.sucursales;
create policy "Los administradores pueden gestionar sucursales." on public.sucursales
  for all using (get_user_role(auth.uid()) = 'admin');

-- Policies for SUCURSAL_PERSONAL
drop policy if exists "Los usuarios autenticados pueden leer las asignaciones de personal." on public.sucursal_personal;
create policy "Los usuarios autenticados pueden leer las asignaciones de personal." on public.sucursal_personal
  for select using (auth.role() = 'authenticated');

drop policy if exists "Los administradores pueden gestionar las asignaciones de personal." on public.sucursal_personal;
create policy "Los administradores pueden gestionar las asignaciones de personal." on public.sucursal_personal
  for all using (get_user_role(auth.uid()) = 'admin');

-- Policies for DEPOSITOS
drop policy if exists "Los usuarios autenticados pueden ver todos los depósitos." on public.depositos;
create policy "Los usuarios autenticados pueden ver todos los depósitos." on public.depositos
  for select using (auth.role() = 'authenticated');

drop policy if exists "Los usuarios pueden crear depósitos." on public.depositos;
create policy "Los usuarios pueden crear depósitos." on public.depositos
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "Los usuarios de finanzas y admin pueden actualizar depósitos." on public.depositos;
create policy "Los usuarios de finanzas y admin pueden actualizar depósitos." on public.depositos
  for update using (get_user_role(auth.uid()) in ('admin', 'finanzas'));

drop policy if exists "Los administradores pueden eliminar depósitos." on public.depositos;
create policy "Los administradores pueden eliminar depósitos." on public.depositos
  for delete using (get_user_role(auth.uid()) = 'admin');
