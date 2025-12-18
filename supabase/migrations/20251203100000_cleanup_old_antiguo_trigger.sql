-- ================================================================
-- LIMPIAR TRIGGER AUTOMÁTICO ANTIGUO
-- Elimina el trigger y función que marcaban automáticamente como antiguo
-- ================================================================

-- 1. Eliminar el trigger automático antiguo
DROP TRIGGER IF EXISTS trigger_check_deposito_antiguo ON public.depositos;

-- 2. Eliminar la función asociada si existe
DROP FUNCTION IF EXISTS check_deposito_antiguo_on_update();

-- 3. Eliminar la función de actualización masiva si existe
DROP FUNCTION IF EXISTS update_depositos_antiguos();

-- Nota: Se mantiene el trigger 'trigger_reset_es_antiguo' que limpia
-- la marca cuando se confirma o rechaza el depósito
