-- Tabla para registrar las solicitudes de exportacion de vouchers
CREATE TABLE public.voucher_export_requests (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued',
  progress integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  processed integer NOT NULL DEFAULT 0,
  files_added integer NOT NULL DEFAULT 0,
  failures jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  zip_bucket text NOT NULL DEFAULT 'voucher-exports',
  zip_path text NULL,
  zip_size_bytes bigint NULL,
  zip_filename text NOT NULL DEFAULT 'vouchers_depositos.zip'
);

CREATE INDEX voucher_export_requests_created_at_idx
  ON public.voucher_export_requests (created_at DESC);

CREATE INDEX voucher_export_requests_status_idx
  ON public.voucher_export_requests (status);

ALTER TABLE public.voucher_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view voucher export requests"
ON public.voucher_export_requests
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- Bucket privado donde se guarda el ZIP antes de descargarlo
INSERT INTO storage.buckets (id, name, public)
VALUES ('voucher-exports', 'voucher-exports', false)
ON CONFLICT (id) DO NOTHING;
