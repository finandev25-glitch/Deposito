create table public.support_requests (
  id uuid not null default gen_random_uuid (),
  requested_by_id text null,
  requested_by_name text not null,
  requested_by_role text null,
  reason text not null,
  pending_count integer not null default 0,
  status text not null default 'pendiente'::text,
  source text not null default 'web'::text,
  acknowledged_by text null,
  acknowledged_at timestamp with time zone null,
  resolved_by text null,
  resolved_at timestamp with time zone null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint support_requests_pkey primary key (id)
) TABLESPACE pg_default;

create index if not exists support_requests_status_idx on public.support_requests using btree (status) TABLESPACE pg_default;

create index if not exists support_requests_created_at_idx on public.support_requests using btree (created_at desc) TABLESPACE pg_default;

create index if not exists support_requests_requested_by_name_idx on public.support_requests using btree (requested_by_name) TABLESPACE pg_default;
