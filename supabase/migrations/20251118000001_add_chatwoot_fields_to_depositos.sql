-- Migration: Add Chatwoot fields to depositos table
-- Description: Adds columns to store Chatwoot conversation ID and message ID
-- Date: 2025-11-18

-- Add chatwoot_conversation_id column to store the Chatwoot conversation ID
ALTER TABLE public.depositos
ADD COLUMN IF NOT EXISTS chatwoot_conversation_id text;

-- Add chatwoot_message_id column to store the Chatwoot message ID
ALTER TABLE public.depositos
ADD COLUMN IF NOT EXISTS chatwoot_message_id text;

-- Add chatwoot_config_id column to reference which Chatwoot config was used
ALTER TABLE public.depositos
ADD COLUMN IF NOT EXISTS chatwoot_config_id integer;

-- Add foreign key constraint to chatwoot_config table
ALTER TABLE public.depositos
ADD CONSTRAINT depositos_chatwoot_config_id_fkey
FOREIGN KEY (chatwoot_config_id)
REFERENCES public.chatwoot_config(id)
ON DELETE SET NULL;

-- Add index for faster queries by conversation_id
CREATE INDEX IF NOT EXISTS idx_depositos_chatwoot_conversation_id
ON public.depositos(chatwoot_conversation_id);

-- Add index for faster queries by message_id
CREATE INDEX IF NOT EXISTS idx_depositos_chatwoot_message_id
ON public.depositos(chatwoot_message_id);

-- Add index for faster queries by config_id
CREATE INDEX IF NOT EXISTS idx_depositos_chatwoot_config_id
ON public.depositos(chatwoot_config_id);

-- Add comments for documentation
COMMENT ON COLUMN public.depositos.chatwoot_conversation_id IS 'ID de la conversación de Chatwoot donde se envió la confirmación del depósito';
COMMENT ON COLUMN public.depositos.chatwoot_message_id IS 'ID del mensaje de Chatwoot enviado con la confirmación del depósito';
COMMENT ON COLUMN public.depositos.chatwoot_config_id IS 'ID de la configuración de Chatwoot utilizada para enviar el mensaje';
