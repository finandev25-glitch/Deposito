-- Desactiva temporalmente la seguridad a nivel de fila para evitar errores de dependencia
alter table public.bancos disable row level security;
alter table public.empresas disable row level security;
alter table public.cuentas_bancarias disable row level security;
alter table public.sucursales disable row level security;
alter table public.sucursal_personal disable row level security;
alter table public.documentos disable row level security;

-- Elimina las políticas antiguas basadas en el rol de administrador
drop policy if exists "Los administradores pueden crear bancos." on public.bancos;
drop policy if exists "Los administradores pueden actualizar bancos." on public.bancos;
drop policy if exists "Los administradores pueden eliminar bancos." on public.bancos;
drop policy if exists "Los administradores pueden crear empresas." on public.empresas;
drop policy if exists "Los administradores pueden actualizar empresas." on public.empresas;
drop policy if exists "Los administradores pueden eliminar empresas." on public.empresas;
drop policy if exists "Los administradores pueden crear cuentas." on public.cuentas_bancarias;
drop policy if exists "Los administradores pueden actualizar cuentas." on public.cuentas_bancarias;
drop policy if exists "Los administradores pueden eliminar cuentas." on public.cuentas_bancarias;
drop policy if exists "Los administradores pueden crear sucursales." on public.sucursales;
drop policy if exists "Los administradores pueden actualizar sucursales." on public.sucursales;
drop policy if exists "Los administradores pueden eliminar sucursales." on public.sucursales;
drop policy if exists "Los administradores pueden gestionar el personal." on public.sucursal_personal;
drop policy if exists "Los usuarios pueden subir documentos" on public.documentos;
drop policy if exists "Los usuarios pueden eliminar sus propios documentos" on public.documentos;

-- Crea nuevas políticas que permiten a CUALQUIER usuario autenticado gestionar los registros

-- Bancos
create policy "Los usuarios autenticados pueden gestionar bancos."
on public.bancos for all
to authenticated
using (true)
with check (true);

-- Empresas
create policy "Los usuarios autenticados pueden gestionar empresas."
on public.empresas for all
to authenticated
using (true)
with check (true);

-- Cuentas Bancarias
create policy "Los usuarios autenticados pueden gestionar cuentas."
on public.cuentas_bancarias for all
to authenticated
using (true)
with check (true);

-- Sucursales
create policy "Los usuarios autenticados pueden gestionar sucursales."
on public.sucursales for all
to authenticated
using (true)
with check (true);

-- Personal de Sucursal
create policy "Los usuarios autenticados pueden gestionar el personal."
on public.sucursal_personal for all
to authenticated
using (true)
with check (true);

-- Documentos
create policy "Los usuarios autenticados pueden gestionar documentos."
on public.documentos for all
to authenticated
using (true)
with check (true);

-- Reactiva la seguridad a nivel de fila
alter table public.bancos enable row level security;
alter table public.empresas enable row level security;
alter table public.cuentas_bancarias enable row level security;
alter table public.sucursales enable row level security;
alter table public.sucursal_personal enable row level security;
alter table public.documentos enable row level security;
