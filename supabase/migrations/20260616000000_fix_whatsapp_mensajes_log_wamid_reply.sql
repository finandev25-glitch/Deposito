-- Force wamid on outbound reply logs to use the replied-to message reference
-- rather than the outbound YCloud id.

CREATE OR REPLACE FUNCTION public.set_whatsapp_mensajes_log_wamid_from_reply()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.metadata IS NOT NULL THEN
    NEW.wamid := COALESCE(
      NULLIF(NEW.metadata->>'reply_to_wamid', ''),
      NULLIF(NEW.metadata->>'reply_to_message_id', ''),
      NEW.wamid
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_whatsapp_mensajes_log_wamid_from_reply ON public.whatsapp_mensajes_log;

CREATE TRIGGER trg_set_whatsapp_mensajes_log_wamid_from_reply
BEFORE INSERT ON public.whatsapp_mensajes_log
FOR EACH ROW
EXECUTE FUNCTION public.set_whatsapp_mensajes_log_wamid_from_reply();
