-- 1. Crear la tabla para Empresas
create table public.empresas (
  id uuid default gen_random_uuid() primary key,
  nombre text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para empresas
alter table public.empresas enable row level security;

-- Políticas para empresas
create policy "Las empresas son visibles para usuarios autenticados"
  on public.empresas for select
  using ( auth.role() = 'authenticated' );

create policy "Los administradores pueden gestionar las empresas"
  on public.empresas for all
  using ( (select rol from public.profiles where id = auth.uid()) = 'admin' )
  with check ( (select rol from public.profiles where id = auth.uid()) = 'admin' );

-- 2. Crear la tabla para Cuentas Bancarias
create table public.cuentas_bancarias (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  banco_id uuid not null references public.bancos(id) on delete cascade,
  anexo text,
  nro_cuenta text not null,
  subdiario text,
  estado text not null default 'activo',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para cuentas_bancarias
alter table public.cuentas_bancarias enable row level security;

-- Políticas para cuentas_bancarias
create policy "Las cuentas son visibles para usuarios autenticados"
  on public.cuentas_bancarias for select
  using ( auth.role() = 'authenticated' );

create policy "Los administradores y usuarios de finanzas pueden gestionar cuentas"
  on public.cuentas_bancarias for all
  using ( (select rol from public.profiles where id = auth.uid()) in ('admin', 'finanzas') )
  with check ( (select rol from public.profiles where id = auth.uid()) in ('admin', 'finanzas') );
