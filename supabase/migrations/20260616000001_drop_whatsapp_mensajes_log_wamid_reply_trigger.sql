-- Remove the reply wamid trigger so outbound logging does not rewrite wamid
-- and stays fast / post-send only.

DROP TRIGGER IF EXISTS trg_set_whatsapp_mensajes_log_wamid_from_reply ON public.whatsapp_mensajes_log;
DROP FUNCTION IF EXISTS public.set_whatsapp_mensajes_log_wamid_from_reply();
