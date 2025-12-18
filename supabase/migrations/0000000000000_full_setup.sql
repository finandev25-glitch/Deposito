-- =============================================
--      SCRIPT DE CONFIGURACIÓN DE BASE DE DATOS
-- =============================================
-- Este script configura toda la base de datos desde cero.
-- Elimina las tablas existentes para asegurar una instalación limpia.
-- ADVERTENCIA: La ejecución de este script borrará todos los datos existentes en las tablas del proyecto.

-- 1. Eliminación de tablas existentes (en orden inverso de dependencia)
drop table if exists public.depositos;
drop table if exists public.sucursal_personal;
drop table if exists public.cuentas_bancarias;
drop table if exists public.sucursales;
drop table if exists public.bancos;
drop table if exists public.empresas;
drop table if exists public.profiles;

-- 2. Creación de Tablas

-- Tabla de Perfiles de Usuario (vinculada a auth.users)
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  nombre text,
  rol text default 'finanzas'::text,
  estado text default 'inactivo'::text,
  usuario text,
  primary key (id)
);
comment on table public.profiles is 'Almacena datos de perfil para usuarios autenticados.';

-- Tabla de Bancos
create table public.bancos (
  id uuid not null default gen_random_uuid(),
  nombre text not null,
  abreviatura text not null,
  estado text not null default 'activo'::text,
  created_at timestamptz not null default now(),
  primary key (id),
  unique (abreviatura)
);
comment on table public.bancos is 'Almacena la lista de bancos disponibles.';

-- Tabla de Empresas
create table public.empresas (
  id uuid not null default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now(),
  primary key (id),
  unique (nombre)
);
comment on table public.empresas is 'Almacena las empresas del grupo.';

-- Tabla de Cuentas Bancarias
create table public.cuentas_bancarias (
  id uuid not null default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  banco_id uuid not null references public.bancos(id) on delete cascade,
  anexo text,
  nro_cuenta text not null,
  subdiario text,
  estado text not null default 'activo'::text,
  created_at timestamptz not null default now(),
  primary key (id)
);
comment on table public.cuentas_bancarias is 'Almacena las cuentas bancarias de cada empresa.';

-- Tabla de Sucursales
create table public.sucursales (
  id uuid not null default gen_random_uuid(),
  nombre text not null,
  telefono text,
  estado text not null default 'activa'::text,
  created_at timestamptz not null default now(),
  primary key (id),
  unique (nombre)
);
comment on table public.sucursales is 'Almacena las sucursales del grupo.';

-- Tabla de Vinculación Sucursal-Personal
create table public.sucursal_personal (
  sucursal_id uuid not null references public.sucursales(id) on delete cascade,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (sucursal_id, usuario_id)
);
comment on table public.sucursal_personal is 'Tabla de unión para personal y sucursales.';

-- Tabla de Depósitos
create table public.depositos (
  id uuid not null default gen_random_uuid(),
  numero_operacion text not null,
  cliente text,
  monto numeric(12, 2) not null,
  moneda text not null,
  fecha_registro timestamptz not null default now(),
  imagen_voucher text,
  anexo text,
  numero_operacion_banco text,
  fecha_deposito date,
  estado text not null default 'pendiente'::text,
  observaciones text,
  motivo_rechazo text,
  fecha_validacion timestamptz,
  empresa_id uuid references public.empresas(id),
  banco_id uuid references public.bancos(id),
  sucursal_id uuid references public.sucursales(id),
  vendedor_id uuid references public.profiles(id),
  validado_por uuid references public.profiles(id),
  primary key (id)
);
comment on table public.depositos is 'Tabla principal para registrar los depósitos.';

-- 3. Funciones y Disparadores (Triggers)

-- Función para obtener el rol de un usuario de forma segura
create or replace function public.get_user_role(user_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select rol from public.profiles where id = user_id;
$$;

-- Función para crear un perfil de usuario automáticamente después del registro
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, usuario)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'user_name'
  );
  return new;
end;
$$;

-- Disparador (trigger) que ejecuta la función handle_new_user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Función para contar el personal por sucursal
create or replace function public.count_personal_by_sucursal()
returns table(sucursal_id uuid, total_count bigint, active_count bigint)
language sql
security definer
set search_path = public
as $$
  select
    sp.sucursal_id,
    count(sp.usuario_id) as total_count,
    count(sp.usuario_id) filter (where p.estado = 'activo') as active_count
  from public.sucursal_personal as sp
  join public.profiles as p on sp.usuario_id = p.id
  group by sp.sucursal_id;
$$;

-- 4. Políticas de Seguridad (Row Level Security - RLS)

-- Habilitar RLS en todas las tablas
alter table public.profiles enable row level security;
alter table public.bancos enable row level security;
alter table public.empresas enable row level security;
alter table public.cuentas_bancarias enable row level security;
alter table public.sucursales enable row level security;
alter table public.sucursal_personal enable row level security;
alter table public.depositos enable row level security;

-- Políticas para `profiles`
drop policy if exists "Permitir acceso completo a administradores." on public.profiles;
drop policy if exists "Los perfiles son visibles para usuarios autenticados." on public.profiles;
drop policy if exists "Los usuarios pueden actualizar su propio perfil." on public.profiles;
create policy "Los perfiles son visibles para usuarios autenticados." on public.profiles for select using ( auth.role() = 'authenticated' );
create policy "Los usuarios pueden actualizar su propio perfil." on public.profiles for update using ( auth.uid() = id );
create policy "Permitir acceso completo a administradores." on public.profiles for all using ( public.get_user_role(auth.uid()) = 'admin' ) with check ( public.get_user_role(auth.uid()) = 'admin' );

-- Políticas para `bancos`
drop policy if exists "Permitir acceso completo a administradores" on public.bancos;
drop policy if exists "Permitir lectura a usuarios autenticados" on public.bancos;
create policy "Permitir acceso completo a administradores" on public.bancos for all using (public.get_user_role(auth.uid()) = 'admin') with check (public.get_user_role(auth.uid()) = 'admin');
create policy "Permitir lectura a usuarios autenticados" on public.bancos for select using (auth.role() = 'authenticated');

-- Políticas para `empresas`
drop policy if exists "Permitir acceso completo a administradores" on public.empresas;
drop policy if exists "Permitir lectura a usuarios autenticados" on public.empresas;
create policy "Permitir acceso completo a administradores" on public.empresas for all using (public.get_user_role(auth.uid()) = 'admin') with check (public.get_user_role(auth.uid()) = 'admin');
create policy "Permitir lectura a usuarios autenticados" on public.empresas for select using (auth.role() = 'authenticated');

-- Políticas para `cuentas_bancarias`
drop policy if exists "Permitir acceso completo a administradores" on public.cuentas_bancarias;
drop policy if exists "Permitir lectura a usuarios autenticados" on public.cuentas_bancarias;
create policy "Permitir acceso completo a administradores" on public.cuentas_bancarias for all using (public.get_user_role(auth.uid()) = 'admin') with check (public.get_user_role(auth.uid()) = 'admin');
create policy "Permitir lectura a usuarios autenticados" on public.cuentas_bancarias for select using (auth.role() = 'authenticated');

-- Políticas para `sucursales`
drop policy if exists "Permitir acceso completo a administradores" on public.sucursales;
drop policy if exists "Permitir lectura a usuarios autenticados" on public.sucursales;
create policy "Permitir acceso completo a administradores" on public.sucursales for all using (public.get_user_role(auth.uid()) = 'admin') with check (public.get_user_role(auth.uid()) = 'admin');
create policy "Permitir lectura a usuarios autenticados" on public.sucursales for select using (auth.role() = 'authenticated');

-- Políticas para `sucursal_personal`
drop policy if exists "Permitir acceso completo a administradores" on public.sucursal_personal;
drop policy if exists "Permitir lectura a usuarios autenticados" on public.sucursal_personal;
create policy "Permitir acceso completo a administradores" on public.sucursal_personal for all using (public.get_user_role(auth.uid()) = 'admin') with check (public.get_user_role(auth.uid()) = 'admin');
create policy "Permitir lectura a usuarios autenticados" on public.sucursal_personal for select using (auth.role() = 'authenticated');

-- Políticas para `depositos`
drop policy if exists "Permitir acceso completo a administradores y finanzas" on public.depositos;
drop policy if exists "Permitir a vendedores ver sus propios depósitos" on public.depositos;
create policy "Permitir acceso completo a administradores y finanzas" on public.depositos for all using (public.get_user_role(auth.uid()) in ('admin', 'finanzas')) with check (public.get_user_role(auth.uid()) in ('admin', 'finanzas'));
create policy "Permitir a vendedores ver sus propios depósitos" on public.depositos for select using (vendedor_id = auth.uid());

-- 5. Otorgar permisos
grant execute on function public.get_user_role(uuid) to authenticated;
grant execute on function public.count_personal_by_sucursal() to authenticated;
