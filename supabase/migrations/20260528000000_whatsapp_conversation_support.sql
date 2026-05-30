-- =====================================================
-- Soporte para historial de conversación WhatsApp
-- Fecha: 2026-05-28
-- =====================================================

-- 0. Asegurar que la tabla base exista en entornos donde no se aplicaron migraciones previas
CREATE TABLE IF NOT EXISTS public.whatsapp_mensajes_log (
  id bigserial PRIMARY KEY,
  configuracion_id integer,
  telefono_destino text NOT NULL,
  tipo_mensaje text NOT NULL DEFAULT 'text',
  contenido jsonb NOT NULL DEFAULT '{}'::jsonb,
  message_id text,
  estado text NOT NULL DEFAULT 'enviando',
  error_mensaje text,
  metadata jsonb DEFAULT '{}'::jsonb,
  enviado_por uuid,
  enviado_en timestamptz DEFAULT now(),
  direction text NOT NULL DEFAULT 'outbound',
  source text NOT NULL DEFAULT 'ycloud',
  conversation_key text,
  attachment_url text,
  attachment_name text,
  attachment_mime_type text,
  storage_bucket text DEFAULT 'whatsapp-media',
  storage_path text
);

-- 1. Ampliar tabla de logs para distinguir dirección y adjuntos
ALTER TABLE public.whatsapp_mensajes_log
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'ycloud',
  ADD COLUMN IF NOT EXISTS conversation_key text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime_type text,
  ADD COLUMN IF NOT EXISTS storage_bucket text DEFAULT 'whatsapp-media',
  ADD COLUMN IF NOT EXISTS storage_path text;

CREATE INDEX IF NOT EXISTS idx_whatsapp_mensajes_log_conversation_key
  ON public.whatsapp_mensajes_log(conversation_key);

CREATE INDEX IF NOT EXISTS idx_whatsapp_mensajes_log_direction
  ON public.whatsapp_mensajes_log(direction);

-- 2. Permitir mensajes entrantes en el estado del log
ALTER TABLE public.whatsapp_mensajes_log
  DROP CONSTRAINT IF EXISTS whatsapp_mensajes_log_estado_check;

ALTER TABLE public.whatsapp_mensajes_log
  ADD CONSTRAINT whatsapp_mensajes_log_estado_check
  CHECK (estado IN ('enviando', 'enviado', 'entregado', 'leido', 'fallido', 'recibido'));

-- 3. Bucket para adjuntos de WhatsApp
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Lectura pública para poder renderizar imágenes en la UI
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public Read Access for WhatsApp Media'
  ) THEN
    CREATE POLICY "Public Read Access for WhatsApp Media"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'whatsapp-media');
  END IF;
END $$;
