-- Elimina objetos existentes para asegurar una nueva ejecución limpia
drop table if exists public.sucursal_personal cascade;
drop table if exists public.sucursales cascade;
drop function if exists public.count_personal_by_sucursal();

-- Crear la tabla para sucursales
create table public.sucursales (
  id uuid not null default gen_random_uuid(),
  nombre text not null,
  telefono text,
  estado text not null default 'activa',
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

-- Crear la tabla intermedia para personal de sucursal
create table public.sucursal_personal (
  sucursal_id uuid not null references public.sucursales on delete cascade,
  usuario_id uuid not null references public.profiles on delete cascade,
  primary key (sucursal_id, usuario_id)
);

-- Habilitar RLS
alter table public.sucursales enable row level security;
alter table public.sucursal_personal enable row level security;

-- Políticas para 'sucursales'
create policy "Enable read access for all users"
  on public.sucursales for select using (true);

create policy "Enable insert for admins"
  on public.sucursales for insert with check (get_user_role(auth.uid()) = 'admin');

create policy "Enable update for admins"
  on public.sucursales for update using (get_user_role(auth.uid()) = 'admin');

create policy "Enable delete for admins"
  on public.sucursales for delete using (get_user_role(auth.uid()) = 'admin');

-- Políticas para 'sucursal_personal'
create policy "Enable read access for all users"
  on public.sucursal_personal for select using (true);

create policy "Enable insert for admins"
  on public.sucursal_personal for insert with check (get_user_role(auth.uid()) = 'admin');

create policy "Enable delete for admins"
  on public.sucursal_personal for delete using (get_user_role(auth.uid()) = 'admin');

-- Crear la función RPC para contar personal
create or replace function public.count_personal_by_sucursal()
returns table(sucursal_id uuid, total_count bigint, active_count bigint)
language plpgsql
as $$
begin
  return query
  select
    sp.sucursal_id,
    count(sp.usuario_id) as total_count,
    count(sp.usuario_id) filter (where p.estado = 'activo') as active_count
  from
    public.sucursal_personal sp
  join
    public.profiles p on sp.usuario_id = p.id
  group by
    sp.sucursal_id;
end;
$$;
