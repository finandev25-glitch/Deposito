alter table public.support_requests
add column if not exists deposit_id uuid;

create unique index if not exists support_requests_deposit_id_unique_idx
on public.support_requests using btree (deposit_id);

comment on column public.support_requests.deposit_id is 'ID del deposito que disparo la alerta automatica';
